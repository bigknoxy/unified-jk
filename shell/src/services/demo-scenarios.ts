/**
 * Demo Scenarios — Industry-specific demo configurations
 * Each scenario maps to existing DEMO_USERS with narrative labels
 */

import { DEMO_USERS } from '../types';
import type { AppManifest, User } from '../types';

export interface ScenarioRole {
  userId: string;
  roleLabel: string;
  narrative: string;
}

export interface WalkthroughStep {
  title: string;
  narrative: string;
  observe: string;
  userId?: string;
}

export interface DemoScenario {
  id: string;
  name: string;
  industry: string;
  description: string;
  compliance: string[];
  color: string;
  roles: ScenarioRole[];
  apps: AppManifest[];
  walkthrough: WalkthroughStep[];
}

const HEALTHCARE_APPS: AppManifest[] = [
  {
    id: 'patient-records',
    name: 'Patient Records',
    description: 'Electronic health records system',
    url: 'http://localhost:8886/patient-records.html',
    icon: 'grid',
    permissions: ['app:read'],
    category: 'Clinical',
    order: 1,
    version: '1.0.0',
    enabled: true
  },
  {
    id: 'billing-system',
    name: 'Billing System',
    description: 'Insurance claims and billing',
    url: 'http://localhost:8886/billing-system.html',
    icon: 'code',
    permissions: ['app:read', 'app:write'],
    category: 'Finance',
    order: 2,
    version: '1.0.0',
    enabled: true
  },
  {
    id: 'dashboard',
    name: 'Compliance Monitor',
    description: 'HIPAA audit trail and access monitoring',
    url: 'http://localhost:8889/index.html',
    icon: 'chart',
    permissions: ['audit:read'],
    category: 'Compliance',
    order: 3,
    version: '1.0.0',
    enabled: true
  },
  {
    id: 'admin-manager',
    name: 'System Admin',
    description: 'Manage applications and access controls',
    url: 'http://localhost:8890/index.html',
    icon: 'settings',
    permissions: ['admin:manage'],
    category: 'Administration',
    order: 4,
    version: '1.0.0',
    enabled: true
  }
];

const FINANCE_APPS: AppManifest[] = [
  {
    id: 'trading-desk',
    name: 'Trading Desk',
    description: 'Real-time trading platform',
    url: 'http://localhost:8886/trading-desk.html',
    icon: 'grid',
    permissions: ['app:read'],
    category: 'Trading',
    order: 1,
    version: '1.0.0',
    enabled: true
  },
  {
    id: 'risk-analytics',
    name: 'Risk Analytics',
    description: 'Portfolio risk analysis and reporting',
    url: 'http://localhost:8886/risk-analytics.html',
    icon: 'code',
    permissions: ['app:read', 'app:write', 'analytics:read'],
    category: 'Analytics',
    order: 2,
    version: '1.0.0',
    enabled: true
  },
  {
    id: 'dashboard',
    name: 'SOX Compliance',
    description: 'Sarbanes-Oxley audit trail',
    url: 'http://localhost:8889/index.html',
    icon: 'chart',
    permissions: ['audit:read'],
    category: 'Compliance',
    order: 3,
    version: '1.0.0',
    enabled: true
  },
  {
    id: 'admin-manager',
    name: 'System Admin',
    description: 'Manage applications and access controls',
    url: 'http://localhost:8890/index.html',
    icon: 'settings',
    permissions: ['admin:manage'],
    category: 'Administration',
    order: 4,
    version: '1.0.0',
    enabled: true
  }
];

const GOVERNMENT_APPS: AppManifest[] = [
  {
    id: 'intel-dashboard',
    name: 'Intelligence Dashboard',
    description: 'Unclassified intelligence reports',
    url: 'http://localhost:8886/intel-dashboard.html',
    icon: 'grid',
    permissions: ['app:read'],
    category: 'Intelligence',
    order: 1,
    version: '1.0.0',
    enabled: true
  },
  {
    id: 'case-management',
    name: 'Case Management',
    description: 'Investigation case tracking',
    url: 'http://localhost:8886/case-management.html',
    icon: 'code',
    permissions: ['app:read', 'app:write'],
    category: 'Operations',
    order: 2,
    version: '1.0.0',
    enabled: true
  },
  {
    id: 'dashboard',
    name: 'Audit Trail',
    description: 'FedRAMP compliance monitoring',
    url: 'http://localhost:8889/index.html',
    icon: 'chart',
    permissions: ['audit:read'],
    category: 'Compliance',
    order: 3,
    version: '1.0.0',
    enabled: true
  },
  {
    id: 'admin-manager',
    name: 'System Admin',
    description: 'Manage applications and clearance levels',
    url: 'http://localhost:8890/index.html',
    icon: 'settings',
    permissions: ['admin:manage'],
    category: 'Administration',
    order: 4,
    version: '1.0.0',
    enabled: true
  }
];

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'healthcare',
    name: 'Healthcare',
    industry: 'Healthcare',
    description: 'HIPAA-compliant patient data access with role-based permissions',
    compliance: ['HIPAA', 'SOC 2', 'HITRUST'],
    color: '#dcfce7',
    roles: [
      { userId: 'alice-admin', roleLabel: 'System Administrator', narrative: 'You manage the entire EHR system. You can access all applications, configure permissions, and review audit logs.' },
      { userId: 'bob-user', roleLabel: 'Physician', narrative: 'You are a doctor accessing patient records. You can view and edit documents but cannot manage system settings.' },
      { userId: 'carol-viewer', roleLabel: 'Billing Specialist', narrative: 'You handle insurance claims. You can read documents but cannot access clinical apps or admin tools.' },
      { userId: 'dave-developer', roleLabel: 'IT Developer', narrative: 'You maintain the EHR platform. You can access developer tools and analytics but not patient billing data.' }
    ],
    apps: HEALTHCARE_APPS,
    walkthrough: [
      {
        title: 'Start as Dr. Smith (Physician)',
        narrative: 'You are a physician logging into the Electronic Health Records system.',
        observe: 'Notice the sidebar shows Patient Records, Billing System, and Compliance Monitor — exactly the apps a doctor needs.',
        userId: 'bob-user'
      },
      {
        title: 'Switch to Billing Specialist',
        narrative: 'Now switch to the billing role. This person handles insurance claims, not patient care.',
        observe: 'The sidebar shrinks dramatically. Billing can only read documents — no clinical apps, no admin tools. This is HIPAA minimum-necessary access.',
        userId: 'carol-viewer'
      },
      {
        title: 'Switch to System Admin',
        narrative: 'The IT administrator has full access to manage the entire platform.',
        observe: 'All four apps appear. Admin can manage applications, view audit logs, and configure the system. Every action they take is logged.',
        userId: 'alice-admin'
      },
      {
        title: 'Check the Audit Trail',
        narrative: 'Open the Compliance Monitor to see the audit trail of all role switches and app accesses.',
        observe: 'Every role switch, login, and app access is recorded with timestamp, user, and action. This is your HIPAA audit trail.',
        userId: 'alice-admin'
      },
      {
        title: 'Complete',
        narrative: 'You have seen how Shell Platform enforces HIPAA minimum-necessary access through role-based permissions.',
        observe: 'Each role sees only the apps they need. Every action is audited. The system is secure by default.'
      }
    ]
  },
  {
    id: 'finance',
    name: 'Finance',
    industry: 'Financial Services',
    description: 'SOX-compliant trading platform with separation of duties',
    compliance: ['SOX', 'PCI DSS', 'SEC Rule 17a-4'],
    color: '#dbeafe',
    roles: [
      { userId: 'alice-admin', roleLabel: 'Compliance Officer', narrative: 'You oversee regulatory compliance. Full access to audit trails, trading systems, and admin controls.' },
      { userId: 'bob-user', roleLabel: 'Trader', narrative: 'You execute trades on the trading desk. You can access the trading platform and related tools.' },
      { userId: 'carol-viewer', roleLabel: 'Risk Analyst', narrative: 'You analyze portfolio risk. You have read-only access to documents and analytics.' },
      { userId: 'dave-developer', roleLabel: 'Quant Developer', narrative: 'You build trading algorithms. You have access to developer tools and analytics.' }
    ],
    apps: FINANCE_APPS,
    walkthrough: [
      {
        title: 'Start as Trader',
        narrative: 'You are a trader on the trading desk. You need fast access to the trading platform.',
        observe: 'The sidebar shows Trading Desk, Risk Analytics, and SOX Compliance — everything a trader needs.',
        userId: 'bob-user'
      },
      {
        title: 'Switch to Risk Analyst',
        narrative: 'Now see what the risk team sees. They analyze but do not execute trades.',
        observe: 'The Risk Analyst has read-only access. They can view documents but cannot access the trading desk directly.',
        userId: 'carol-viewer'
      },
      {
        title: 'Switch to Compliance Officer',
        narrative: 'The compliance officer has oversight of the entire operation.',
        observe: 'Full access to all systems. Every trade, every risk analysis, every system change is visible in the audit trail.',
        userId: 'alice-admin'
      },
      {
        title: 'Review the Audit Trail',
        narrative: 'Open SOX Compliance to see the complete audit trail.',
        observe: 'Every trade, every role switch, every system access is logged with full attribution. This is your SOX compliance evidence.',
        userId: 'alice-admin'
      },
      {
        title: 'Complete',
        narrative: 'You have seen how Shell Platform enforces separation of duties for SOX compliance.',
        observe: 'Traders trade, analysts analyze, compliance oversees. No single role can bypass controls.'
      }
    ]
  },
  {
    id: 'government',
    name: 'Government',
    industry: 'Government & Defense',
    description: 'FedRAMP-authorized platform with clearance-based access control',
    compliance: ['FedRAMP', 'NIST 800-53', 'FISMA'],
    color: '#fef3c7',
    roles: [
      { userId: 'alice-admin', roleLabel: 'Security Officer', narrative: 'You manage security clearances and system access. Full oversight of all applications and audit trails.' },
      { userId: 'bob-user', roleLabel: 'Analyst', narrative: 'You analyze intelligence reports. You have access to unclassified applications and document systems.' },
      { userId: 'carol-viewer', roleLabel: 'Auditor', narrative: 'You conduct security audits. You can only access the audit trail — no operational systems.',
      },
      { userId: 'dave-developer', roleLabel: 'Systems Engineer', narrative: 'You maintain the platform infrastructure. You have access to developer tools and analytics.' }
    ],
    apps: GOVERNMENT_APPS,
    walkthrough: [
      {
        title: 'Start as Analyst',
        narrative: 'You are an intelligence analyst with unclassified clearance.',
        observe: 'The sidebar shows Intelligence Dashboard, Case Management, and Audit Trail — all within your clearance level.',
        userId: 'bob-user'
      },
      {
        title: 'Switch to Auditor',
        narrative: 'The auditor has a very narrow scope: audit access only.',
        observe: 'Only the Audit Trail is visible. The auditor cannot access any operational systems. This is need-to-know enforcement.',
        userId: 'carol-viewer'
      },
      {
        title: 'Switch to Security Officer',
        narrative: 'The security officer has full oversight of the entire platform.',
        observe: 'All applications are visible. The security officer can manage access controls, review audit trails, and configure the system.',
        userId: 'alice-admin'
      },
      {
        title: 'Review the Audit Trail',
        narrative: 'Open the Audit Trail to see the complete access log.',
        observe: 'Every login, every app access, every role switch is recorded. This is your FedRAMP continuous monitoring evidence.',
        userId: 'alice-admin'
      },
      {
        title: 'Complete',
        narrative: 'You have seen how Shell Platform enforces need-to-know access for government systems.',
        observe: 'Each role sees only what their clearance permits. Every action is audited. The system meets FedRAMP requirements.'
      }
    ]
  }
];

export function getScenario(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find(s => s.id === id);
}

export function getAllScenarios(): DemoScenario[] {
  return DEMO_SCENARIOS;
}

export function getUserForScenario(scenarioId: string, roleIndex: number): User | undefined {
  const scenario = getScenario(scenarioId);
  if (!scenario || !scenario.roles[roleIndex]) return undefined;
  return DEMO_USERS.find(u => u.id === scenario.roles[roleIndex].userId);
}
