#!/bin/bash

# Simple test script for Vertical Slice #1
# Tests the complete design-to-cart workflow

echo "🧪 Testing SkuFlow Vertical Slice #1 - Design to Cart"
echo "========================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base URL
API="http://localhost:3000/api"

# Test 1: Get products
echo -e "\n${GREEN}Test 1: Get Products${NC}"
PRODUCTS=$(curl -s "$API/products")
PRODUCT_ID=$(echo $PRODUCTS | jq -r '.[0].id' 2>/dev/null)
if [ "$PRODUCT_ID" != "null" ] && [ -n "$PRODUCT_ID" ]; then
  echo -e "${GREEN}✓ Found product: $PRODUCT_ID${NC}"
else
  echo -e "${RED}✗ Failed to get products${NC}"
  echo $PRODUCTS
fi

# Test 2: Get product details
echo -e "\n${GREEN}Test 2: Get Product Details${NC}"
if [ -n "$PRODUCT_ID" ]; then
  PRODUCT=$(curl -s "$API/products/$PRODUCT_ID")
  VARIANT_ID=$(echo $PRODUCT | jq -r '.variants[0].id' 2>/dev/null)
  if [ "$VARIANT_ID" != "null" ] && [ -n "$VARIANT_ID" ]; then
    echo -e "${GREEN}✓ Found variant: $VARIANT_ID${NC}"
  else
    echo -e "${RED}✗ Failed to get variants${NC}"
  fi
fi

# Test 3: Register/Login user
echo -e "\n${GREEN}Test 3: Authentication${NC}"
REGISTER=$(curl -s -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}')
TOKEN=$(echo $REGISTER | jq -r '.token' 2>/dev/null)
if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✓ Registration successful, token: ${TOKEN:0:20}...${NC}"
else
  echo -e "${RED}✗ Failed to register${NC}"
  echo $REGISTER
fi

# Test 4: Create design
echo -e "\n${GREEN}Test 4: Create Design${NC}"
if [ -n "$TOKEN" ]; then
  DESIGN=$(curl -s -X POST "$API/designs" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"Test Design","description":"My custom design","content":{"layers":[],"canvas":{"width":800,"height":600}}}')
  DESIGN_ID=$(echo $DESIGN | jq -r '.id' 2>/dev/null)
  if [ "$DESIGN_ID" != "null" ] && [ -n "$DESIGN_ID" ]; then
    echo -e "${GREEN}✓ Design created: $DESIGN_ID${NC}"
  else
    echo -e "${RED}✗ Failed to create design${NC}"
    echo $DESIGN
  fi
fi

# Test 5: Get or create cart
echo -e "\n${GREEN}Test 5: Get/Create Cart${NC}"
CART=$(curl -s "$API/cart?sessionId=test-session-123")
CART_ID=$(echo $CART | jq -r '.id' 2>/dev/null)
if [ "$CART_ID" != "null" ] && [ -n "$CART_ID" ]; then
  echo -e "${GREEN}✓ Cart created: $CART_ID${NC}"
else
  echo -e "${RED}✗ Failed to create cart${NC}"
  echo $CART
fi

# Test 6: Add item to cart
echo -e "\n${GREEN}Test 6: Add Item to Cart${NC}"
if [ -n "$CART_ID" ] && [ -n "$PRODUCT_ID" ] && [ -n "$VARIANT_ID" ]; then
  ADD_ITEM=$(curl -s -X POST "$API/cart/items" \
    -H "Content-Type: application/json" \
    -d "{\"cartId\":\"$CART_ID\",\"productId\":\"$PRODUCT_ID\",\"variantId\":\"$VARIANT_ID\",\"quantity\":1,\"designId\":\"$DESIGN_ID\",\"mockupUrl\":\"https://example.com/mockup.png\"}")
  ITEM_ID=$(echo $ADD_ITEM | jq -r '.items[0].id' 2>/dev/null)
  if [ "$ITEM_ID" != "null" ] && [ -n "$ITEM_ID" ]; then
    echo -e "${GREEN}✓ Item added to cart: $ITEM_ID${NC}"
  else
    echo -e "${RED}✗ Failed to add item to cart${NC}"
    echo $ADD_ITEM
  fi
fi

echo -e "\n${GREEN}=========================================================${NC}"
echo -e "${GREEN}✓ Test suite completed!${NC}"

