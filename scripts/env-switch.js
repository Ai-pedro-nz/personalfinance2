#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error('Error getting current branch:', error.message);
    return null;
  }
}

function getEnvironmentForBranch(branch) {
  const branchEnvMap = {
    'main': '.env.production',
    'mvp-v1-stable': '.env',
    'feature/next-iteration': '.env.local',
    // Default for any other feature branches
    'default': '.env.local'
  };

  return branchEnvMap[branch] || branchEnvMap['default'];
}

function switchEnvironment() {
  const currentBranch = getCurrentBranch();
  if (!currentBranch) {
    console.error('Could not determine current branch');
    process.exit(1);
  }

  const targetEnvFile = getEnvironmentForBranch(currentBranch);
  const activeEnvFile = '.env.active';
  
  console.log(`Current branch: ${currentBranch}`);
  console.log(`Target environment: ${targetEnvFile}`);

  // Check if target environment file exists
  if (!fs.existsSync(targetEnvFile)) {
    console.error(`Environment file ${targetEnvFile} does not exist`);
    process.exit(1);
  }

  try {
    // Copy the target environment file to .env.active
    fs.copyFileSync(targetEnvFile, activeEnvFile);
    console.log(`✓ Environment switched to ${targetEnvFile}`);
    
    // Show which environment is now active
    const envContent = fs.readFileSync(activeEnvFile, 'utf8');
    const nodeEnvMatch = envContent.match(/NODE_ENV=["']?([^"'\n]+)["']?/);
    const databaseMatch = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
    
    if (nodeEnvMatch) {
      console.log(`✓ NODE_ENV: ${nodeEnvMatch[1]}`);
    }
    
    if (databaseMatch) {
      const dbType = databaseMatch[1].includes('file:') ? 'SQLite (local)' : 'PostgreSQL (remote)';
      console.log(`✓ Database: ${dbType}`);
    }
    
  } catch (error) {
    console.error('Error switching environment:', error.message);
    process.exit(1);
  }
}

// Run the environment switch
switchEnvironment();