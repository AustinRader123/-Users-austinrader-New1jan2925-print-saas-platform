#!/bin/bash

# Quick test of the vertical slice

echo "=== Testing Vertical Slice ===" 
echo ""

# Test 1: Get products
echo "1. Testing GET /api/products..."
curl -s http://localhost:3000/api/products | head -100

echo ""
echo "2. Testing POST /api/auth/register..."
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User"}' | jq . || echo "Failed or jq not installed"

echo ""
echo "3. Testing POST /api/auth/login..."
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com","password":"password123"}' | jq . || echo "Failed or jq not installed"

echo ""
echo "Done!"
