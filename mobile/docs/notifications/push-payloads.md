# Push Notification Payloads and Topics

This document defines the topics and data payloads for push notifications sent via Firebase Cloud Messaging (FCM).

## Topics

Notifications are sent to specific topics that users or devices can subscribe to. This allows for targeted messaging.

- `assignments_{userId}`: For notifications related to a specific user's assignments (e.g., new sampling tasks for a Sampler).
- `requisition_{requisitionId}`: For updates on a specific requisition, subscribed to by its creator and relevant approvers.
- `asset_alerts_{regionId}`: For broader alerts, like a critical asset being flagged in a user's operational region.

## Payload Structure

All notifications follow a standard structure, containing a user-visible `notification` block and a `data` block for the app to process.

### 1. New Sampling Assignment

- **Topic:** `assignments_{userId}`
- **Description:** Informs a Sampler that a new task has been assigned to them.

```json
{
  "notification": {
    "title": "New Assignment Available",
    "body": "A new sampling assignment has been added to your list."
  },
  "data": {
    "eventType": "NEW_ASSIGNMENT",
    "assignmentId": "UUID",
    "assetName": "String",
    "dueDate": "ISO_8601_DATE"
  }
}
```

### 2. Requisition Status Change

- **Topic:** `requisition_{requisitionId}`
- **Description:** Notifies the originator and relevant parties about a change in a requisition's status (e.g., approved, rejected).

```json
{
  "notification": {
    "title": "Requisition Updated",
    "body": "The status of your requisition for 'Pump Station A' has been changed to 'Approved'."
  },
  "data": {
    "eventType": "REQUISITION_STATUS_CHANGE",
    "requisitionId": "UUID",
    "newStatus": "Enum ('approved', 'rejected', 'in_progress')",
    "updatedBy": "String (User Name)"
  }
}
```

### 3. Critical Asset Alert

- **Topic:** `asset_alerts_{regionId}`
- **Description:** Sends an alert to all relevant personnel in a region when an asset is flagged as critical.

```json
{
  "notification": {
    "title": "Critical Asset Alert",
    "body": "Asset 'Main Water Valve 3' has been flagged as critical."
  },
  "data": {
    "eventType": "ASSET_FLAGGED_CRITICAL",
    "assetId": "UUID",
    "assetName": "String",
    "flaggedBy": "String (User Name)",
    "notes": "String (Optional notes from the field)"
  }
}
```
