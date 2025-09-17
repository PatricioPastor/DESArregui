import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Obtener todos los modelos únicos de la base de datos
    const phoneModels = await prisma.phone_model.findMany({
      select: {
        id: true,
        brand: true,
        model: true,
        storage_gb: true,
        color: true,
      },
      orderBy: [
        { brand: 'asc' },
        { model: 'asc' }
      ]
    });

    // Convertir a formato para Select component
    const modelOptions = phoneModels.map(model => {
      const displayName = model.storage_gb
        ? `${model.brand} ${model.model} ${model.storage_gb}GB`
        : `${model.brand} ${model.model}`;

      const displayNameWithColor = model.color && model.color.trim() !== ""
        ? `${displayName} (${model.color})`
        : displayName;

      return {
        value: displayNameWithColor.trim(),
        label: displayNameWithColor.trim(),
        id: model.id,
        brand: model.brand,
        model: model.model,
        storage_gb: model.storage_gb,
        color: model.color
      };
    });

    return NextResponse.json({
      success: true,
      data: modelOptions,
      totalRecords: modelOptions.length
    });

  } catch (error) {
    console.error("Models API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brand, model, storage_gb, color } = body;

    if (!brand || !model) {
      return NextResponse.json(
        { success: false, error: "Brand and model are required" },
        { status: 400 }
      );
    }

    // Verificar si el modelo ya existe
    const existingModel = await prisma.phone_model.findFirst({
      where: {
        brand: brand,
        model: model,
        storage_gb: storage_gb || null,
        color: color || ""
      }
    });

    if (existingModel) {
      return NextResponse.json(
        { success: false, error: "Model already exists" },
        { status: 409 }
      );
    }

    // Crear nuevo modelo
    const phoneModel = await prisma.phone_model.create({
      data: {
        brand: brand,
        model: model,
        storage_gb: storage_gb || null,
        color: color || ""
      }
    });

    return NextResponse.json({
      success: true,
      message: "Phone model created successfully",
      data: phoneModel
    });

  } catch (error) {
    console.error("Create model error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}