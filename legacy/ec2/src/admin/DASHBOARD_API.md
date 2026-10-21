# Dashboard API

## Endpoint

| Method | Path | Auth | Module |
|--------|------|------|--------|
| GET | `/admin/dashboard` | Bearer JWT | REPORTS |

### Query parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| startDate | string | No | Start date `YYYY-MM-DD` |
| endDate | string | No | End date `YYYY-MM-DD` |

Example: `GET /admin/dashboard?startDate=2026-01-01&endDate=2026-01-31`

---

## Response outline

```json
{
  "success": true,
  "message": "Sales dashboard data retrieved successfully",
  "data": {
    "summary": {
      "totalRevenue": 0,
      "totalProfit": 0,
      "totalBills": 0,
      "totalServiceRequests": 0,
      "totalEnquiries": 0,
      "averageBillValue": 0,
      "profitMargin": 0
    },
    "financial": {
      "totalRevenue": 0,
      "totalCost": 0,
      "totalProfit": 0,
      "profitMargin": 0,
      "averageBillValue": 0,
      "totalBills": 0
    },
    "serviceRequests": {
      "total": 0,
      "byStatus": { "Request received": 0, "In progress": 0 },
      "byDevice": { "deviceKey": 0 }
    },
    "enquiries": {
      "total": 0,
      "corporate": {
        "total": 0,
        "byStatus": {},
        "byType": {}
      },
      "b2c": {
        "total": 0,
        "byStatus": {},
        "byType": {}
      }
    },
    "trends": {
      "dailyRevenue": [
        { "date": "YYYY-MM-DD", "revenue": 0, "count": 0 }
      ]
    },
    "recentActivity": {
      "bills": [],
      "serviceRequests": [],
      "enquiries": []
    },
    "dateRange": {
      "startDate": null,
      "endDate": null
    }
  }
}
```

TypeScript types are in `dto/dashboard-response.outline.ts` for use in the frontend.
