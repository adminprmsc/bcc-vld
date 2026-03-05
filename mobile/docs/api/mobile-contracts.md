# Mobile API Contracts

This document outlines the DTOs and endpoints specific to the mobile application. These are extensions to the existing web platform API.

## 1. Critical Asset Flagging

When a Field Officer (RA) flags an asset as critical, the mobile app will send the following payload.

**Endpoint:** `POST /api/v1/assets/{assetId}/flags`

**Payload:**

```json
{
  "isCritical": true,
  "notes": "String (optional user-provided notes)",
  "flaggedAt": "ISO_8601_TIMESTAMP"
}
```

## 2. Mobile Requisitions

To support offline-first requisitions, a separate endpoint is used to submit new requisitions created on the mobile device.

**Endpoint:** `POST /api/v1/requisitions/mobile`

**Payload:**

```json
{
  "localId": "UUID (client-generated ID for deduplication)",
  "assetId": "String",
  "priority": "Enum ('low', 'medium', 'high')",
  "requiredBy": "ISO_8601_DATE",
  "items": [
    {
      "name": "String",
      "quantity": "Integer"
    }
  ],
  "notes": "String (optional)",
  "createdAt": "ISO_8601_TIMESTAMP"
}
```

## 3. Sampling Workflow

The sampling workflow involves submitting sample data collected in the field.

**Endpoint:** `POST /api/v1/samples`

**Payload:**

```json
{
  "localId": "UUID",
  "assignmentId": "String",
  "barcode": "String",
  "collectedAt": "ISO_8601_TIMESTAMP",
  "measurements": [
    {
      "type": "Enum ('ph', 'turbidity', 'temperature')",
      "value": "Float",
      "unit": "String"
    }
  ],
  "photos": [
    {
      "localPath": "String (path to image on device)",
      "uploadedUrl": "String (URL after successful upload)"
    }
  ]
}
```
