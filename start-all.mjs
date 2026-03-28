#!/usr/bin/env node
/**
 * Shell Platform - Start All Services
 * Single command to start SDK, Shell, Sample App, Audit Service, and Manifest Registry
 */

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

// Ports used by services
const SERVICE_PORTS = [8888, 8887, 8886, 8080, 8081];

function killProcessesOnPorts() {
  console.log('Checking for existing processes on service ports...');
  for (const port of SERVICE_PORTS) {
    try {
      // Try to find and kill processes on this port
      // Linux: use fuser or lsof
      const platform = process.platform;
      if (platform === 'linux' || platform === 'darwin') {
        try {
          // Use lsof to find PID and kill it
          const output = execSync(`lsof -ti:${port}`).toString().trim();
          if (output) {
            const pids = output.split('\n');
            for (const pid of pids) {
              if (pid) {
                console.log(`Killing process ${pid} on port ${port}`);
                try {
                  process.kill(parseInt(pid), 'SIGTERM');
                } catch (e) {
                  // Process might already be dead
                }
              }
            }
          }
        } catch (e) {
          // No process found on this port, which is fine
        }
      } else if (platform === 'win32') {
        try {
          const output = execSync(`netstat -ano | findstr :${port}`).toString();
          const lines = output.split('\n');
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(parseInt(pid))) {
              console.log(`Killing process ${pid} on port ${port}`);
              try {
                execSync(`taskkill /PID ${pid} /F`);
              } catch (e) {
                // Process might already be dead
              }
            }
          }
        } catch (e) {
          // No process found on this port
        }
      }
    } catch (e) {
      // Ignore errors from port checking
    }
  }
  // Give processes time to shut down
  console.log('Waiting for ports to be released...');
  execSync('sleep 1');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for output
const colors = {
  sdk: '\x1b[36m',      // Cyan
  shell: '\x1b[34m',    // Blue
  sample: '\x1b[32m',   // Green
  audit: '\x1b[33m',    // Yellow
  registry: '\x1b[35m', // Magenta
  reset: '\x1b[0m',
  error: '\x1b[31m',    // Red
  info: '\x1b[90m'      // Gray
};

const services = [
  {
    name: 'SDK CDN',
    short: 'SDK',
    dir: 'sdk',
    cmd: 'sh',
    args: ['-c', 'echo "[SDK] Starting on http://localhost:8887" && python3 -m http.server 8887'],
    color: colors.sdk,
    readyPattern: /Starting on/
  },
  {
    name: 'Audit Service',
    short: 'AUDIT',
    dir: 'audit-service',
    cmd: 'npx',
    args: ['tsx', 'watch', 'src/index.ts'],
    color: colors.audit,
    readyPattern: /Server running/
  },
  {
    name: 'Manifest Registry',
    short: 'REGISTRY',
    dir: 'manifest-registry',
    cmd: 'npx',
    args: ['tsx', 'watch', 'src/index.ts'],
    color: colors.registry,
    readyPattern: /Server running/
  },
  {
    name: 'Sample App',
    short: 'SAMPLE',
    dir: 'sample-app',
    cmd: 'sh',
    args: ['-c', 'echo "[SAMPLE] Starting on http://localhost:8886" && python3 -m http.server 8886'],
    color: colors.sample,
    readyPattern: /Starting on/
  },
  {
    name: 'Shell App',
    short: 'SHELL',
    dir: 'shell',
    cmd: 'npm',
    args: ['run', 'dev'],
    color: colors.shell,
    readyPattern: /VITE.*v\d+\.\d+\.\d+.*ready/
  }
];

const processes = [];
const servicesReady = new Set();

function log(short, message, color, isError = false) {
  const prefix = `${color}[${short.padEnd(8)}]${colors.reset}`;
  const lines = message.toString().trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      console.log(`${prefix} ${line}`);
    }
  });
}

function shutdown(signal) {
  console.log(`\n${colors.info}Shutting down all services...${colors.reset}`);

  processes.forEach(proc => {
    try {
      proc.kill(signal);
    } catch (e) {
      // Process might already be dead
    }
  });

  // Force exit after 3 seconds
  setTimeout(() => {
    console.log(`${colors.error}Force exiting...${colors.reset}`);
    process.exit(1);
  }, 3000);
}

// Handle Ctrl+C and termination
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', () => shutdown('SIGTERM'));

console.log(`${colors.info}========================================${colors.reset}`);
console.log(`${colors.info}  Shell Platform - Starting Services${colors.reset}`);
console.log(`${colors.info}========================================${colors.reset}\n`);

// Kill any existing processes on service ports
killProcessesOnPorts();

// Ensure logs directory exists for audit service
try {
  mkdirSync(join(__dirname, 'audit-service/logs'), { recursive: true });
} catch (e) {
  // Ignore
}

// Start each service
services.forEach(service => {
  const cwd = join(__dirname, service.dir);

  const proc = spawn(service.cmd, service.args, {
    cwd,
    stdio: 'pipe',
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  processes.push(proc);

  proc.stdout.on('data', (data) => {
    log(service.short, data, service.color);

    // Check if service is ready (only count once per service)
    const dataStr = data.toString();
    if (service.readyPattern && !servicesReady.has(service.short) && service.readyPattern.test(dataStr)) {
      servicesReady.add(service.short);
      if (servicesReady.size === services.length) {
        console.log(`\n${colors.info}========================================${colors.reset}`);
        console.log(`${colors.info}  All services ready!${colors.reset}`);
        console.log(`${colors.info}========================================${colors.reset}`);
        console.log(`${colors.shell}  Shell:       http://localhost:8888${colors.reset}`);
        console.log(`${colors.sample}  Sample App:  http://localhost:8886${colors.reset}`);
        console.log(`${colors.sdk}  SDK CDN:     http://localhost:8887${colors.reset}`);
        console.log(`${colors.audit}  Audit:       http://localhost:8080${colors.reset}`);
        console.log(`${colors.registry}  Registry:    http://localhost:8081${colors.reset}`);
        console.log(`${colors.info}========================================${colors.reset}\n`);
      }
    }
  });

  proc.stderr.on('data', (data) => {
    log(service.short, data, colors.error, true);
  });

  proc.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`${colors.error}[${service.short.padEnd(8)}] Exited with code ${code}${colors.reset}`);
    }
  });

  proc.on('error', (err) => {
    console.log(`${colors.error}[${service.short.padEnd(8)}] Failed to start: ${err.message}${colors.reset}`);
  });
});

console.log(`${colors.info}Starting ${services.length} services...${colors.reset}\n`);
