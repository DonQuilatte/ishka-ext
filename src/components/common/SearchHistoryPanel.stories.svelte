<script lang="ts">
  import type { Meta, StoryObj } from '@storybook/svelte';
  import SearchHistoryPanel from '../ui/SearchHistoryPanel.svelte';

  const meta: Meta<SearchHistoryPanel> = {
    title: 'Components/SearchHistoryPanel',
    component: SearchHistoryPanel,
    parameters: {
      layout: 'padded',
      docs: {
        description: {
          component: 'Advanced search and history panel with diagnostics filtering, token usage tracking, and timeline visualization. Features comprehensive filtering, real-time updates, and export capabilities.'
        }
      }
    },
    argTypes: {
      showSearch: {
        control: 'boolean',
        description: 'Show search input and filtering controls'
      },
      showHistory: {
        control: 'boolean',
        description: 'Show history timeline with expandable items'
      },
      showDiagnosticsFilter: {
        control: 'boolean',
        description: 'Show diagnostic-specific filter options'
      },
      showTokens: {
        control: 'boolean',
        description: 'Show token usage information and statistics'
      },
      maxHistoryItems: {
        control: { type: 'number', min: 10, max: 200, step: 10 },
        description: 'Maximum number of history items to display'
      },
      compact: {
        control: 'boolean',
        description: 'Use compact layout with reduced spacing'
      }
    },
    tags: ['autodocs']
  };

  export default meta;
  type Story = StoryObj<typeof meta>;

  // Mock data for stories
  const mockHistory = [
    {
      id: 'diagnostic-1',
      type: 'diagnostic',
      title: 'DOM: Element detection successful',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      status: 'pass',
      category: 'dom',
      data: {
        category: 'dom',
        status: 'pass',
        message: 'Element detection successful',
        details: 'Found 15 message elements, 3 input fields',
        duration: 125
      }
    },
    {
      id: 'session-1',
      type: 'session',
      title: 'New conversation started',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      data: {
        conversationId: 'conv-123',
        title: 'New conversation started',
        messageCount: 0,
        isActive: true
      }
    },
    {
      id: 'diagnostic-2',
      type: 'diagnostic',
      title: 'API: Rate limit exceeded',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      status: 'warning',
      category: 'api',
      data: {
        category: 'api',
        status: 'warning',
        message: 'Rate limit exceeded',
        details: 'API calls throttled for 30 seconds',
        duration: 50
      }
    },
    {
      id: 'error-1',
      type: 'error',
      title: 'Storage: IndexedDB quota exceeded',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      status: 'fail',
      data: {
        type: 'storage',
        message: 'IndexedDB quota exceeded',
        stack: 'QuotaExceededError: Failed to execute...',
        url: 'https://chat.openai.com/',
        metadata: {
          usedSpace: '98.5MB',
          totalSpace: '100MB'
        }
      }
    },
    {
      id: 'diagnostic-3',
      type: 'diagnostic',
      title: 'Performance: Page load time acceptable',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      status: 'pass',
      category: 'performance',
      data: {
        category: 'performance',
        status: 'pass',
        message: 'Page load time acceptable',
        details: 'DOMContentLoaded: 1.2s, Full load: 2.1s',
        duration: 2100
      }
    }
  ];

  const mockTokenUsage = {
    prompt: 15420,
    completion: 8730,
    total: 24150,
    cost: 0.0483
  };

  // Mock Chrome runtime for stories
  if (typeof chrome === 'undefined') {
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: async (message: any) => {
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
          
          switch (message.type) {
            case 'get-diagnostic-log':
              return { data: mockHistory.filter(item => item.type === 'diagnostic') };
            case 'get-session-history':
              return { data: mockHistory.filter(item => item.type === 'session') };
            case 'get-error-log':
              return { data: mockHistory.filter(item => item.type === 'error') };
            case 'get-token-usage':
              return { data: mockTokenUsage };
            default:
              return { data: null };
          }
        }
      }
    };
  }
</script>

<script>
  export const Default: Story = {
    args: {
      showSearch: true,
      showHistory: true,
      showDiagnosticsFilter: true,
      showTokens: false,
      maxHistoryItems: 50,
      compact: false
    }
  };

  export const WithTokens: Story = {
    args: {
      showSearch: true,
      showHistory: true,
      showDiagnosticsFilter: true,
      showTokens: true,
      maxHistoryItems: 50,
      compact: false
    }
  };

  export const SearchOnly: Story = {
    args: {
      showSearch: true,
      showHistory: false,
      showDiagnosticsFilter: true,
      showTokens: false,
      maxHistoryItems: 50,
      compact: false
    },
    parameters: {
      docs: {
        description: {
          story: 'Search interface only, useful for dedicated search dialogs or space-constrained layouts.'
        }
      }
    }
  };

  export const HistoryOnly: Story = {
    args: {
      showSearch: false,
      showHistory: true,
      showDiagnosticsFilter: false,
      showTokens: false,
      maxHistoryItems: 50,
      compact: false
    },
    parameters: {
      docs: {
        description: {
          story: 'History timeline only, useful for dedicated history views or dashboard widgets.'
        }
      }
    }
  };

  export const Compact: Story = {
    args: {
      showSearch: true,
      showHistory: true,
      showDiagnosticsFilter: true,
      showTokens: true,
      maxHistoryItems: 30,
      compact: true
    },
    parameters: {
      docs: {
        description: {
          story: 'Compact layout with reduced spacing, suitable for sidebar panels or mobile views.'
        }
      }
    }
  };

  export const DiagnosticsFilter: Story = {
    args: {
      showSearch: true,
      showHistory: true,
      showDiagnosticsFilter: true,
      showTokens: false,
      maxHistoryItems: 50,
      compact: false
    },
    parameters: {
      docs: {
        description: {
          story: 'Full filtering capabilities for diagnostic categories, status, and date ranges.'
        }
      }
    }
  };

  export const TokenDashboard: Story = {
    args: {
      showSearch: false,
      showHistory: false,
      showDiagnosticsFilter: false,
      showTokens: true,
      maxHistoryItems: 50,
      compact: false
    },
    parameters: {
      docs: {
        description: {
          story: 'Token usage dashboard only, useful for monitoring API consumption and costs.'
        }
      }
    }
  };

  export const LimitedHistory: Story = {
    args: {
      showSearch: true,
      showHistory: true,
      showDiagnosticsFilter: false,
      showTokens: false,
      maxHistoryItems: 10,
      compact: true
    },
    parameters: {
      docs: {
        description: {
          story: 'Limited history with compact layout, useful for quick access panels or preview widgets.'
        }
      }
    }
  };
</script>

<!-- Story implementations -->
<Default />
<WithTokens />
<SearchOnly />
<HistoryOnly />
<Compact />
<DiagnosticsFilter />
<TokenDashboard />
<LimitedHistory />