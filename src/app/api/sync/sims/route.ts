import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { SimRecordInput, SimSyncResponse } from '@/lib/types';
import { parseEmpresa, validateSimRecord } from '@/lib/sim-utils';

interface SyncRequest {
  sims: SimRecordInput[];
}

/**
 * Find or create distributor by name
 */
async function findOrCreateDistributor(distributorName: string): Promise<string> {
  // Try to find existing distributor (case-insensitive)
  const existing = await prisma.distributor.findFirst({
    where: {
      name: {
        equals: distributorName,
        mode: 'insensitive',
      },
    },
  });

  if (existing) {
    return existing.id;
  }

  // Create new distributor
  const newDistributor = await prisma.distributor.create({
    data: {
      name: distributorName.trim(),
    },
  });

  return newDistributor.id;
}

/**
 * Bulk upsert SIMs using raw SQL for maximum performance.
 * This is optimized for large datasets (68k+ records).
 * Uses PostgreSQL's INSERT ... ON CONFLICT DO UPDATE for efficient bulk operations.
 */
const bulkUpsertSims = async (
  sims: Array<{
    icc: string;
    ip: string | null;
    status: string;
    provider: 'CLARO' | 'MOVISTAR';
    distributor_id: string | null;
  }>
) => {
  if (sims.length === 0) return { created: 0, updated: 0 };

  // Get existing ICCs before upsert to count created vs updated
  const existingIccs = await prisma.sim.findMany({
    where: {
      icc: { in: sims.map(s => s.icc) },
    },
    select: { icc: true },
  });

  const existingIccSet = new Set(existingIccs.map(s => s.icc));
  const expectedCreated = sims.filter(s => !existingIccSet.has(s.icc)).length;
  const expectedUpdated = sims.length - expectedCreated;

  // Process in chunks to avoid parameter limit issues
  // Each row needs 8 parameters (icc, ip, status, provider, distributor_id, is_active, last_sync, updated_at)
  const CHUNK_SIZE = 4000; // Reduced to account for more parameters
  const chunks = [];

  for (let i = 0; i < sims.length; i += CHUNK_SIZE) {
    chunks.push(sims.slice(i, i + CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    // Build query with proper parameterization
    const placeholders: string[] = [];
    const queryValues: any[] = [];
    let paramIndex = 1;

    for (const sim of chunk) {
      placeholders.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}::phones.sim_provider, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`
      );
      queryValues.push(
        sim.icc,
        sim.ip,
        sim.status,
        sim.provider,
        sim.distributor_id,
        true, // is_active
        new Date(), // last_sync
        new Date() // updated_at
      );
      paramIndex += 8;
    }

    const query = `
      INSERT INTO phones.sim (icc, ip, status, provider, distributor_id, is_active, last_sync, updated_at)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (icc) 
      DO UPDATE SET
        ip = EXCLUDED.ip,
        status = EXCLUDED.status,
        provider = EXCLUDED.provider,
        distributor_id = EXCLUDED.distributor_id,
        is_active = EXCLUDED.is_active,
        last_sync = EXCLUDED.last_sync,
        updated_at = EXCLUDED.updated_at;
    `;

    await prisma.$executeRawUnsafe(query, ...queryValues);
  }

  return { created: expectedCreated, updated: expectedUpdated };
};

/**
 * Alternative approach: Process in smaller batches using Prisma
 * This is more reliable but slightly slower than raw SQL
 */
const batchUpsertSims = async (
  sims: Array<{
    icc: string;
    ip: string | null;
    status: string;
    provider: 'CLARO' | 'MOVISTAR';
    distributor_id: string | null;
  }>
) => {
  if (sims.length === 0) return { created: 0, updated: 0 };

  let created = 0;
  let updated = 0;

  // Process in batches of 500 for better performance
  const BATCH_SIZE = 500;
  const batches = [];

  for (let i = 0; i < sims.length; i += BATCH_SIZE) {
    batches.push(sims.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    // Get existing ICCs for this batch
    const batchIccs = batch.map(s => s.icc);
    const existingSims = await prisma.sim.findMany({
      where: { icc: { in: batchIccs } },
      select: { icc: true },
    });

    const existingIccSet = new Set(existingSims.map(s => s.icc));
    const toCreate = batch.filter(s => !existingIccSet.has(s.icc));
    const toUpdate = batch.filter(s => existingIccSet.has(s.icc));

    // Bulk create new SIMs
    if (toCreate.length > 0) {
      await prisma.sim.createMany({
        data: toCreate.map(s => ({
          icc: s.icc,
          ip: s.ip,
          status: s.status,
          provider: s.provider,
          distributor_id: s.distributor_id,
          is_active: true,
          last_sync: new Date(),
        })),
        skipDuplicates: true,
      });
      created += toCreate.length;
    }

    // Bulk update existing SIMs
    if (toUpdate.length > 0) {
      // Update in parallel for better performance
      await Promise.all(
        toUpdate.map(sim =>
          prisma.sim.update({
            where: { icc: sim.icc },
            data: {
              ip: sim.ip,
              status: sim.status,
              provider: sim.provider,
              distributor_id: sim.distributor_id,
              is_active: true,
              last_sync: new Date(),
              updated_at: new Date(),
            },
          })
        )
      );
      updated += toUpdate.length;
    }
  }

  return { created, updated };
};

export async function POST(request: NextRequest) {
  try {
    let providedSimsCount = 0;
    let incomingSims: SimRecordInput[] = [];

    try {
      const payload = (await request.json()) as SyncRequest;
      if (Array.isArray(payload?.sims)) {
        incomingSims = payload.sims;
        providedSimsCount = incomingSims.length;
      }
    } catch (error) {
      console.warn('[sims-sync] No se recibieron SIMs en el body, se espera que se envíen en el request');
    }

    if (incomingSims.length === 0) {
      return NextResponse.json<SimSyncResponse>(
        {
          success: false,
          processed: 0,
          created: 0,
          updated: 0,
          deactivated: 0,
          createdDistributors: 0,
          errors: 1,
          error: 'No se recibieron SIMs para sincronizar. Envía un array de SIMs en el body: { "sims": [...] }',
        },
        { status: 400 }
      );
    }

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      deactivated: 0,
      createdDistributors: 0,
      errors: 0,
      errorDetails: [] as Array<{ sim: Partial<SimRecordInput>; error: string }>,
    };

    // Get all existing distributors before processing to track new ones
    const existingDistributors = await prisma.distributor.findMany({
      select: { id: true, name: true },
    });
    const existingDistributorNames = new Set(
      existingDistributors.map(d => d.name.toLowerCase().trim())
    );

    // Parse and validate SIMs, resolve distributors
    const processedSims: Array<{
      icc: string;
      ip: string | null;
      status: string;
      provider: 'CLARO' | 'MOVISTAR';
      distributor_id: string | null;
    }> = [];

    // Group by distributor name to minimize DB queries
    const distributorCache = new Map<string, string>();

    for (const simInput of incomingSims) {
      // Validate SIM record
      const validation = validateSimRecord({
        icc: simInput.ICC,
        ip: simInput.IP,
        status: simInput.Estado,
        empresa: simInput.Empresa,
      });

      if (!validation.valid) {
        results.errors++;
        results.errorDetails.push({
          sim: simInput,
          error: validation.error || 'Validation failed',
        });
        continue;
      }

      // Parse empresa to get provider and distributor
      const parsed = parseEmpresa(simInput.Empresa);
      if (!parsed) {
        results.errors++;
        results.errorDetails.push({
          sim: simInput,
          error: `Invalid empresa format: "${simInput.Empresa}"`,
        });
        continue;
      }

      // Get or create distributor
      let distributorId: string | null = null;
      if (parsed.distributorName) {
        const distributorNameLower = parsed.distributorName.toLowerCase().trim();
        
        if (!distributorCache.has(distributorNameLower)) {
          // Check if distributor existed before
          const existedBefore = existingDistributorNames.has(distributorNameLower);
          
          distributorId = await findOrCreateDistributor(parsed.distributorName);
          distributorCache.set(distributorNameLower, distributorId);
          
          // Count if it was newly created
          if (!existedBefore) {
            results.createdDistributors++;
            existingDistributorNames.add(distributorNameLower); // Update set for subsequent checks
          }
        } else {
          distributorId = distributorCache.get(distributorNameLower)!;
        }
      }

      processedSims.push({
        icc: simInput.ICC.trim(),
        ip: simInput.IP?.trim() || null,
        status: simInput.Estado?.trim() || 'Inventario',
        provider: parsed.provider,
        distributor_id: distributorId,
      });
    }

    if (processedSims.length === 0) {
      return NextResponse.json<SimSyncResponse>(
        {
          success: false,
          processed: 0,
          created: 0,
          updated: 0,
          deactivated: 0,
          createdDistributors: results.createdDistributors,
          errors: results.errors,
          error: 'No hay SIMs válidas para procesar después de la validación',
          details: { errors: results.errorDetails.slice(0, 10) },
        },
        { status: 400 }
      );
    }

    // Get all incoming ICCs to mark others as inactive
    const incomingIccs = processedSims.map(s => s.icc).filter(Boolean);

    // Mark SIMs as inactive if they're not in the incoming data
    // Process in chunks to avoid PostgreSQL parameter limit (32767)
    if (incomingIccs.length > 0) {
      const CHUNK_SIZE = 10000; // Safe chunk size for PostgreSQL
      let totalDeactivated = 0;

      // If we have incoming ICCs, mark others as inactive
      // Use raw SQL to avoid parameter limit issues
      if (incomingIccs.length > CHUNK_SIZE) {
        // For large datasets, use a more efficient approach
        // Mark all as inactive first, then reactivate the ones in incoming list
        await prisma.$executeRawUnsafe(`
          UPDATE phones.sim 
          SET is_active = false, updated_at = NOW(), last_sync = NOW()
          WHERE is_active = true
        `);

        // Then reactivate the ones that are in the incoming list
        for (let i = 0; i < incomingIccs.length; i += CHUNK_SIZE) {
          const chunk = incomingIccs.slice(i, i + CHUNK_SIZE);
          const placeholders = chunk.map((_, idx) => `$${idx + 1}`).join(', ');
          await prisma.$executeRawUnsafe(
            `UPDATE phones.sim SET is_active = true WHERE icc IN (${placeholders})`,
            ...chunk
          );
        }

        // Count deactivated (total active - incoming)
        const totalActive = await prisma.sim.count({ where: { is_active: true } });
        totalDeactivated = totalActive - incomingIccs.length;
      } else {
        // For smaller datasets, use the standard approach
        const deactivatedSims = await prisma.sim.updateMany({
          where: {
            icc: { notIn: incomingIccs },
            is_active: true,
          },
          data: {
            is_active: false,
            updated_at: new Date(),
            last_sync: new Date(),
          },
        });
        totalDeactivated = deactivatedSims.count;
      }

      results.deactivated = Math.max(0, totalDeactivated);
    }

    // Use bulk upsert for large datasets
    try {
      const { created, updated } = await bulkUpsertSims(processedSims);
      results.created = created;
      results.updated = updated;
      results.processed = processedSims.length;
    } catch (bulkError) {
      console.warn('[sims-sync] Bulk upsert failed, falling back to batch upsert:', bulkError);
      // Fallback to batch upsert if raw SQL fails
      try {
        const { created, updated } = await batchUpsertSims(processedSims);
        results.created = created;
        results.updated = updated;
        results.processed = processedSims.length;
      } catch (batchError) {
        console.error('[sims-sync] Batch upsert also failed:', batchError);
        throw batchError;
      }
    }

    const response: SimSyncResponse = {
      success: results.errors === 0,
      processed: results.processed,
      created: results.created,
      updated: results.updated,
      deactivated: results.deactivated,
      createdDistributors: results.createdDistributors,
      errors: results.errors,
    };

    // Include error details if there were errors
    if (results.errors > 0 && results.errorDetails.length > 0) {
      response.details = {
        errors: results.errorDetails.slice(0, 10), // Limit to first 10 errors
      };
    }

    const statusCode = results.errors === 0 ? 200 : 207; // 207 = Multi-Status

    return NextResponse.json<SimSyncResponse>(response, { status: statusCode });
  } catch (error) {
    console.error('SIMs sync error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json<SimSyncResponse>(
      {
        success: false,
        processed: 0,
        created: 0,
        updated: 0,
        deactivated: 0,
        createdDistributors: 0,
        errors: 1,
        error: `Failed to sync SIMs: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
