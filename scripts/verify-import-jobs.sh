#!/usr/bin/env bash
set -euo pipefail
BASE=${BASE:-http://127.0.0.1:3000}
EMAIL=${EMAIL:-admin@local.test}
PASS=${PASS:-Admin123!}
VENDOR_ID=${VENDOR_ID:-cml4eylpx000ozt0e6befp2j4}
STORE_ID=${STORE_ID:-cml43c2kt000110xp4pq3a76b}
CSV=${CSV:-samples/vendor_catalog.csv}

TOKEN=$(curl -sS -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" "$BASE/api/auth/login" | jq -r .token)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then echo "Login failed"; exit 1; fi

resp=$(curl -sS -H "Authorization: Bearer $TOKEN" -F "storeId=$STORE_ID" -F "file=@$CSV" "$BASE/api/vendors/$VENDOR_ID/import-csv")
jobId=$(echo "$resp" | jq -r .jobId)
if [ -z "$jobId" ] || [ "$jobId" = "null" ]; then echo "Failed to create job: $resp"; exit 1; fi

echo "Job created: $jobId"

# Poll status
status=""
count=0
while true; do
  detail=$(curl -sS -H "Authorization: Bearer $TOKEN" "$BASE/api/import-jobs/$jobId")
  status=$(echo "$detail" | jq -r .status)
  percent=$(echo "$detail" | jq -r .percent)
  echo "Status: $status (${percent}%)"
  if [[ "$status" == "SUCCESS" || "$status" == "FAILED" ]]; then break; fi
  count=$((count+1))
  if [ $count -gt 300 ]; then echo "Timeout"; exit 1; fi
  sleep 1
done

echo "Summary:" && echo "$detail" | jq '{processedRows,totalRows,createdCount,updatedCount,failedRows,status}'

failed=$(echo "$detail" | jq -r .failedRows)
if [ "$failed" -gt 0 ]; then
  echo "First errors:" && curl -sS -H "Authorization: Bearer $TOKEN" "$BASE/api/import-jobs/$jobId/errors?limit=20" | jq '.'
  echo "Trigger retry..."
  newResp=$(curl -sS -H "Authorization: Bearer $TOKEN" -X POST "$BASE/api/import-jobs/$jobId/retry")
  newJob=$(echo "$newResp" | jq -r .newJobId)
  echo "New job: $newJob"
fi
