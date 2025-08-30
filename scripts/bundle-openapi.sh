#!/bin/bash
# Bundle modular OpenAPI files into a single openapi-consolidated.yaml
npx swagger-cli bundle docs/openapi/openapi.yaml -o docs/openapi/openapi-consolidated.yaml --type yaml
