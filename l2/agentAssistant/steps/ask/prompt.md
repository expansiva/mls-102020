<!-- modelType: agent -->

Return JSON only. Do not call tools. Do not explain.

Required payload, exactly:
{
  "type": "clarification",
  "json": {
    "planId": "{{planId}}"
  }
}
