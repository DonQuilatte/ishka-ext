<script lang="ts">
  import type { Meta, StoryObj } from '@storybook/svelte';
  import FilterDropdown from './FilterDropdown.svelte';

  const meta: Meta<FilterDropdown> = {
    title: 'Components/Inputs/FilterDropdown',
    component: FilterDropdown,
    parameters: {
      layout: 'padded',
      docs: {
        description: {
          component: 'Reusable dropdown component with design token styling, option counts, and accessibility features. Fully compliant with the Ishka design system using only --ishka-* tokens.'
        }
      }
    },
    argTypes: {
      label: {
        control: 'text',
        description: 'Label text displayed above the dropdown'
      },
      options: {
        control: 'object',
        description: 'Array of options with value, label, count, and disabled properties'
      },
      value: {
        control: 'text',
        description: 'Currently selected value'
      },
      showCounts: {
        control: 'boolean',
        description: 'Whether to display option counts in parentheses'
      },
      compact: {
        control: 'boolean',
        description: 'Use compact styling with reduced spacing'
      },
      disabled: {
        control: 'boolean',
        description: 'Disable the dropdown'
      },
      placeholder: {
        control: 'text',
        description: 'Placeholder text when no option is selected'
      }
    },
    tags: ['autodocs']
  };

  export default meta;
  type Story = StoryObj<typeof meta>;

  // Mock options for stories
  const basicOptions = [
    { value: 'all', label: 'All Items' },
    { value: 'important', label: 'Important' },
    { value: 'normal', label: 'Normal' },
    { value: 'low', label: 'Low Priority' }
  ];

  const optionsWithCounts = [
    { value: 'all', label: 'All Categories', count: 156 },
    { value: 'dom', label: 'DOM', count: 42 },
    { value: 'api', label: 'API', count: 38 },
    { value: 'storage', label: 'Storage', count: 24 },
    { value: 'worker', label: 'Worker', count: 18 },
    { value: 'performance', label: 'Performance', count: 34 }
  ];

  const optionsWithDisabled = [
    { value: 'all', label: 'All Status' },
    { value: 'pass', label: 'Passed', count: 89 },
    { value: 'fail', label: 'Failed', count: 12 },
    { value: 'warning', label: 'Warning', count: 24 },
    { value: 'pending', label: 'Pending', disabled: true },
    { value: 'cancelled', label: 'Cancelled', disabled: true }
  ];

  let selectedValue = $state('all');
  let selectedValueWithCounts = $state('all');
  let selectedValueDisabled = $state('all');
  let compactValue = $state('dom');
  let disabledValue = $state('pass');

  function handleChange(newValue: string) {
    selectedValue = newValue;
  }

  function handleChangeWithCounts(newValue: string) {
    selectedValueWithCounts = newValue;
  }

  function handleChangeDisabled(newValue: string) {
    selectedValueDisabled = newValue;
  }

  function handleCompactChange(newValue: string) {
    compactValue = newValue;
  }

  function handleDisabledChange(newValue: string) {
    disabledValue = newValue;
  }
</script>

<script>
  export const Default: Story = {
    args: {
      label: 'Priority Level',
      options: basicOptions,
      value: 'all',
      onChange: handleChange,
      showCounts: false,
      compact: false,
      disabled: false,
      placeholder: 'Select priority...'
    }
  };

  export const WithCounts: Story = {
    args: {
      label: 'Category Filter',
      options: optionsWithCounts,
      value: 'all',
      onChange: handleChangeWithCounts,
      showCounts: true,
      compact: false,
      disabled: false
    },
    parameters: {
      docs: {
        description: {
          story: 'FilterDropdown with option counts displayed in parentheses, useful for showing result quantities.'
        }
      }
    }
  };

  export const WithDisabledOptions: Story = {
    args: {
      label: 'Status Filter',
      options: optionsWithDisabled,
      value: 'all',
      onChange: handleChangeDisabled,
      showCounts: true,
      compact: false,
      disabled: false
    },
    parameters: {
      docs: {
        description: {
          story: 'FilterDropdown with some options disabled, useful for contextual filtering where certain options are not available.'
        }
      }
    }
  };

  export const Compact: Story = {
    args: {
      label: 'Category',
      options: optionsWithCounts,
      value: 'dom',
      onChange: handleCompactChange,
      showCounts: true,
      compact: true,
      disabled: false
    },
    parameters: {
      docs: {
        description: {
          story: 'Compact version with reduced spacing and smaller font sizes, ideal for tight layouts and sidebars.'
        }
      }
    }
  };

  export const Disabled: Story = {
    args: {
      label: 'Disabled Filter',
      options: optionsWithCounts,
      value: 'pass',
      onChange: handleDisabledChange,
      showCounts: true,
      compact: false,
      disabled: true
    },
    parameters: {
      docs: {
        description: {
          story: 'Disabled state showing reduced opacity and no pointer events.'
        }
      }
    }
  };

  export const EmptyState: Story = {
    args: {
      label: 'No Options',
      options: [],
      value: '',
      onChange: handleChange,
      showCounts: false,
      compact: false,
      disabled: false,
      placeholder: 'No options available'
    },
    parameters: {
      docs: {
        description: {
          story: 'FilterDropdown with no options available, showing placeholder text.'
        }
      }
    }
  };

  export const LongLabels: Story = {
    args: {
      label: 'Complex Filter Options',
      options: [
        { value: 'all', label: 'All Complex Filter Categories with Very Long Names' },
        { value: 'diagnostics', label: 'Advanced Diagnostic Categories and Performance Metrics' },
        { value: 'sessions', label: 'User Session Management and Conversation History' },
        { value: 'errors', label: 'Error Reporting and Exception Handling Systems' }
      ],
      value: 'all',
      onChange: handleChange,
      showCounts: false,
      compact: false,
      disabled: false
    },
    parameters: {
      docs: {
        description: {
          story: 'FilterDropdown handling long option labels with proper text wrapping and overflow handling.'
        }
      }
    }
  };

  export const Interactive: Story = {
    args: {
      label: 'Interactive Demo',
      options: optionsWithCounts,
      value: 'all',
      onChange: handleChangeWithCounts,
      showCounts: true,
      compact: false,
      disabled: false
    },
    parameters: {
      docs: {
        description: {
          story: 'Fully interactive FilterDropdown for testing all interaction states and keyboard navigation.'
        }
      }
    }
  };

  export const DarkMode: Story = {
    args: {
      label: 'Dark Mode Example',
      options: optionsWithCounts,
      value: 'dom',
      onChange: handleChangeWithCounts,
      showCounts: true,
      compact: false,
      disabled: false
    },
    parameters: {
      docs: {
        description: {
          story: 'FilterDropdown in dark color scheme, demonstrating automatic theme adaptation via CSS custom properties.'
        }
      },
      backgrounds: {
        default: 'dark'
      }
    }
  };
</script>

<!-- Story implementations with live state management -->
<div style="width: 300px;">
  <Default />
  <br><br>
  
  <WithCounts />
  <br><br>
  
  <WithDisabledOptions />
  <br><br>
  
  <Compact />
  <br><br>
  
  <Disabled />
  <br><br>
  
  <EmptyState />
  <br><br>
  
  <LongLabels />
  <br><br>
  
  <Interactive />
  <br><br>
  
  <DarkMode />
</div>