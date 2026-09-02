#!/bin/bash

# VoiceShield AI - Deployment Verification Script
# Usage: ./verify-deployment.sh [environment]

set -e

ENVIRONMENT=${1:-production}
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================"
echo "VoiceShield AI - Deployment Verification"
echo "Environment: $ENVIRONMENT"
echo "================================"
echo ""

# Counter for checks
CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to check status
check() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $1${NC}"
    ((CHECKS_PASSED++))
  else
    echo -e "${RED}✗ $1${NC}"
    ((CHECKS_FAILED++))
  fi
}

# Function to check if file exists
file_exists() {
  [ -f "$1" ]
  check "File exists: $1"
}

# Function to check if directory exists
dir_exists() {
  [ -d "$1" ]
  check "Directory exists: $1"
}

# Function to check port availability
port_open() {
  timeout 2 bash -c "echo > /dev/tcp/localhost/$1" 2>/dev/null
  check "Port $1 is open"
}

# Function to check HTTP endpoint
http_check() {
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$1")
  if [ "$STATUS" != "000" ]; then
    check "HTTP endpoint accessible: $1 (Status: $STATUS)"
  else
    echo -e "${RED}✗ HTTP endpoint not accessible: $1${NC}"
    ((CHECKS_FAILED++))
  fi
}

echo "=== System Requirements ==="
# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2)
if [[ "$NODE_VERSION" > "18.0.0" ]]; then
  echo -e "${GREEN}✓ Node.js version: $NODE_VERSION${NC}"
  ((CHECKS_PASSED++))
else
  echo -e "${RED}✗ Node.js version too old: $NODE_VERSION (need >= 18.0.0)${NC}"
  ((CHECKS_FAILED++))
fi

# Check npm version
NPM_VERSION=$(npm -v 2>/dev/null)
echo -e "${GREEN}✓ npm version: $NPM_VERSION${NC}"
((CHECKS_PASSED++))

echo ""
echo "=== Build Artifacts ==="

# Check backend build
dir_exists "backend/dist"
file_exists "backend/dist/server.js"

# Check frontend build
dir_exists "frontend/dist"
file_exists "frontend/dist/index.html"

echo ""
echo "=== Environment Configuration ==="

# Check environment files
file_exists ".env.production"
file_exists "frontend/.env.production"

echo ""
echo "=== Database Configuration ==="

# Check database connection if PostgreSQL is running
if command -v psql &> /dev/null; then
  psql --version
  echo -e "${YELLOW}Note: Database tests require a running PostgreSQL instance${NC}"
else
  echo -e "${YELLOW}⚠ PostgreSQL not found locally (OK if using remote database)${NC}"
fi

echo ""
echo "=== Docker Configuration ==="

# Check Docker files
file_exists "backend/Dockerfile"
file_exists "frontend/Dockerfile"
file_exists "docker-compose.prod.yml"

# Check Docker/Docker Compose installation
if command -v docker &> /dev/null; then
  DOCKER_VERSION=$(docker --version)
  echo -e "${GREEN}✓ Docker installed: $DOCKER_VERSION${NC}"
  ((CHECKS_PASSED++))
else
  echo -e "${YELLOW}⚠ Docker not installed (required for Docker deployment)${NC}"
fi

if command -v docker-compose &> /dev/null; then
  DC_VERSION=$(docker-compose --version)
  echo -e "${GREEN}✓ Docker Compose installed: $DC_VERSION${NC}"
  ((CHECKS_PASSED++))
else
  echo -e "${YELLOW}⚠ Docker Compose not installed (required for multi-container)${NC}"
fi

echo ""
echo "=== Package Dependencies ==="

# Check backend dependencies
if [ -d "backend/node_modules" ]; then
  echo -e "${GREEN}✓ Backend dependencies installed${NC}"
  ((CHECKS_PASSED++))
else
  echo -e "${YELLOW}⚠ Backend dependencies not installed (run: cd backend && npm ci)${NC}"
  ((CHECKS_FAILED++))
fi

# Check frontend dependencies
if [ -d "frontend/node_modules" ]; then
  echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
  ((CHECKS_PASSED++))
else
  echo -e "${YELLOW}⚠ Frontend dependencies not installed (run: cd frontend && npm ci)${NC}"
  ((CHECKS_FAILED++))
fi

echo ""
echo "=== Network Configuration ==="

# Check if ports are available (only if not in Docker mode)
if [ "$ENVIRONMENT" != "docker" ]; then
  if ! port_open 4000; then
    echo -e "${YELLOW}⚠ Port 4000 may already be in use${NC}"
  fi
  
  if ! port_open 3000; then
    echo -e "${YELLOW}⚠ Port 3000 may already be in use${NC}"
  fi
fi

echo ""
echo "=== Security Configuration ==="

# Check for secure secrets
if grep -q "change-me" ".env.production"; then
  echo -e "${RED}✗ Security: Default secrets found in .env.production - MUST CHANGE${NC}"
  ((CHECKS_FAILED++))
else
  echo -e "${GREEN}✓ Security: No obvious default secrets in configuration${NC}"
  ((CHECKS_PASSED++))
fi

# Check if .env files are gitignored
if grep -q ".env" ".gitignore" 2>/dev/null; then
  echo -e "${GREEN}✓ Security: .env files are gitignored${NC}"
  ((CHECKS_PASSED++))
else
  echo -e "${YELLOW}⚠ Security: .env files may not be properly gitignored${NC}"
fi

echo ""
echo "=== Build Verification ==="

# Verify TypeScript compilation
if npm run build --prefix backend > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Backend TypeScript compilation successful${NC}"
  ((CHECKS_PASSED++))
else
  echo -e "${RED}✗ Backend TypeScript compilation failed${NC}"
  ((CHECKS_FAILED++))
fi

echo ""
echo "================================"
echo "Summary"
echo "================================"
echo -e "${GREEN}Passed: $CHECKS_PASSED${NC}"
echo -e "${RED}Failed: $CHECKS_FAILED${NC}"

if [ $CHECKS_FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ All critical checks passed! Ready for deployment.${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}✗ Some checks failed. Please address the issues above.${NC}"
  exit 1
fi
