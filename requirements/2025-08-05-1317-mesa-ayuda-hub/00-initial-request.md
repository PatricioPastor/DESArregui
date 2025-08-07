# Initial Request - Mesa de Ayuda Hub

**Date:** 2025-08-05 13:17  
**Request ID:** mesa-ayuda-hub

## Original Request

Transform the current Untitled UI Next.js starter kit into a Mesa de Ayuda Hub application for Grupo DESA mobile support operations.

## Context from User

Based on context.md, the requirements include:

### Core Purpose
- Mesa de Ayuda Hub for mobile support level 2 operations
- Centralize data from Google Sheets (BASE with SOTI/eTarifacion/STOCK/EDESA lookups)
- Dynamic UI with real-time data refresh and automated tracking

### Key Objectives
- Automate tracking of device connections (flags "Usando"/inactive >7 days)
- Manage lines/plans, status assignments, and tickets
- Reduce manual tasks by 40% (especially 0800 calls)
- Provide KPI dashboards for inactives/stock/projections
- Enable Claude AI integration for component generation

### Target Users
- Mesa de Ayuda team (level 2 mobile support)
- Remote branch offices (EDEN) for stock visibility  
- Management for KPI reporting

### Technical Requirements
- Next.js application with Google Sheets API integration
- API endpoints for data pulling and webhook updates
- IMEI tracking with distributor filtering
- Email alerts for inactive devices
- Real-time dashboard with charts and tables

## Current Status
- Base Untitled UI starter kit is set up
- CLAUDE.md has been updated with project context
- Ready to begin detailed requirements gathering