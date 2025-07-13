<script lang="ts">
  import type { Meta, StoryObj } from '@storybook/svelte';
  import DateRangePicker from './DateRangePicker.svelte';

  const meta: Meta<DateRangePicker> = {
    title: 'Components/Inputs/DateRangePicker',
    component: DateRangePicker,
    parameters: {
      layout: 'padded',
      docs: {
        description: {
          component: 'Dual-input date range picker with --ishka-* token compliance. Features automatic validation, keyboard navigation, and responsive design with clear button and error states.'
        }
      }
    },
    argTypes: {
      label: {
        control: 'text',
        description: 'Label text displayed above the date range inputs'
      },
      start: {
        control: 'date',
        description: 'Start date value in YYYY-MM-DD format'
      },
      end: {
        control: 'date',
        description: 'End date value in YYYY-MM-DD format'
      },
      min: {
        control: 'date',
        description: 'Minimum selectable date'
      },
      max: {
        control: 'date',
        description: 'Maximum selectable date'
      },
      compact: {
        control: 'boolean',
        description: 'Use compact styling with reduced spacing'
      },
      disabled: {
        control: 'boolean',
        description: 'Disable both date inputs'
      },
      showClear: {
        control: 'boolean',
        description: 'Show clear button to reset both dates'
      },
      startPlaceholder: {
        control: 'text',
        description: 'Placeholder text for start date input'
      },
      endPlaceholder: {
        control: 'text',
        description: 'Placeholder text for end date input'
      },
      error: {
        control: 'text',
        description: 'Error message to display below inputs'
      }
    },
    tags: ['autodocs']
  };

  export default meta;
  type Story = StoryObj<typeof meta>;

  // Helper function to get date strings
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // State for interactive examples
  let defaultStart = $state('');
  let defaultEnd = $state('');
  let validatedStart = $state(formatDate(yesterday));
  let validatedEnd = $state(formatDate(today));
  let restrictedStart = $state('');
  let restrictedEnd = $state('');
  let compactStart = $state(formatDate(lastMonth));
  let compactEnd = $state(formatDate(today));
  let errorStart = $state(formatDate(today));
  let errorEnd = $state(formatDate(yesterday)); // Invalid: end before start
  let interactiveStart = $state('');
  let interactiveEnd = $state('');

  function handleDefaultChange(start: string, end: string) {
    defaultStart = start;
    defaultEnd = end;
  }

  function handleValidatedChange(start: string, end: string) {
    validatedStart = start;
    validatedEnd = end;
  }

  function handleRestrictedChange(start: string, end: string) {
    restrictedStart = start;
    restrictedEnd = end;
  }

  function handleCompactChange(start: string, end: string) {
    compactStart = start;
    compactEnd = end;
  }

  function handleErrorChange(start: string, end: string) {
    errorStart = start;
    errorEnd = end;
  }

  function handleInteractiveChange(start: string, end: string) {
    interactiveStart = start;
    interactiveEnd = end;
  }

  // Computed error message for validation example
  $derived: validationError = errorStart && errorEnd && new Date(errorStart) > new Date(errorEnd) 
    ? 'Start date must be before or equal to end date' 
    : '';
</script>

<script>
  export const Default: Story = {
    args: {
      label: 'Date Range',
      start: '',
      end: '',
      onChange: handleDefaultChange,
      compact: false,
      disabled: false,
      showClear: true,
      startPlaceholder: 'Start date',
      endPlaceholder: 'End date'
    }
  };

  export const WithValues: Story = {
    args: {
      label: 'Report Period',
      start: formatDate(yesterday),
      end: formatDate(today),
      onChange: handleValidatedChange,
      compact: false,
      disabled: false,
      showClear: true
    },
    parameters: {
      docs: {
        description: {
          story: 'DateRangePicker with pre-filled values, demonstrating normal usage with selected dates.'
        }
      }
    }
  };

  export const Restricted: Story = {
    args: {
      label: 'Limited Range',
      start: '',
      end: '',
      onChange: handleRestrictedChange,
      min: formatDate(lastMonth),
      max: formatDate(nextWeek),
      compact: false,
      disabled: false,
      showClear: true
    },
    parameters: {
      docs: {
        description: {
          story: 'DateRangePicker with min/max date restrictions, useful for limiting selections to valid periods.'
        }
      }
    }
  };

  export const Compact: Story = {
    args: {
      label: 'Filter Dates',
      start: formatDate(lastMonth),
      end: formatDate(today),
      onChange: handleCompactChange,
      compact: true,
      disabled: false,
      showClear: true
    },
    parameters: {
      docs: {
        description: {
          story: 'Compact version with reduced spacing and smaller inputs, ideal for filter panels and tight layouts.'
        }
      }
    }
  };

  export const Disabled: Story = {
    args: {
      label: 'Disabled Range',
      start: formatDate(yesterday),
      end: formatDate(today),
      onChange: handleValidatedChange,
      compact: false,
      disabled: true,
      showClear: true
    },
    parameters: {
      docs: {
        description: {
          story: 'Disabled state showing reduced opacity and no interaction capability.'
        }
      }
    }
  };

  export const WithError: Story = {
    args: {
      label: 'Invalid Range',
      start: formatDate(today),
      end: formatDate(yesterday),
      onChange: handleErrorChange,
      compact: false,
      disabled: false,
      showClear: true,
      error: 'Start date must be before or equal to end date'
    },
    parameters: {
      docs: {
        description: {
          story: 'DateRangePicker with validation error, showing red borders and error message.'
        }
      }
    }
  };

  export const NoClearButton: Story = {
    args: {
      label: 'Required Range',
      start: formatDate(yesterday),
      end: formatDate(today),
      onChange: handleValidatedChange,
      compact: false,
      disabled: false,
      showClear: false
    },
    parameters: {
      docs: {
        description: {
          story: 'DateRangePicker without clear button, useful for required date ranges.'
        }
      }
    }
  };

  export const CustomPlaceholders: Story = {
    args: {
      label: 'Event Duration',
      start: '',
      end: '',
      onChange: handleDefaultChange,
      compact: false,
      disabled: false,
      showClear: true,
      startPlaceholder: 'Event start',
      endPlaceholder: 'Event end'
    },
    parameters: {
      docs: {
        description: {
          story: 'DateRangePicker with custom placeholder text for better context.'
        }
      }
    }
  };

  export const Interactive: Story = {
    args: {
      label: 'Interactive Demo',
      start: '',
      end: '',
      onChange: handleInteractiveChange,
      compact: false,
      disabled: false,
      showClear: true,
      startPlaceholder: 'Select start date',
      endPlaceholder: 'Select end date'
    },
    parameters: {
      docs: {
        description: {
          story: 'Fully interactive DateRangePicker for testing keyboard navigation, validation, and all interaction states.'
        }
      }
    }
  };

  export const ResponsiveMobile: Story = {
    args: {
      label: 'Mobile Layout',
      start: formatDate(yesterday),
      end: formatDate(today),
      onChange: handleValidatedChange,
      compact: true,
      disabled: false,
      showClear: true
    },
    parameters: {
      docs: {
        description: {
          story: 'DateRangePicker optimized for mobile viewports with stacked layout.'
        }
      },
      viewport: {
        defaultViewport: 'mobile1'
      }
    }
  };
</script>

<!-- Story implementations with live state management -->
<div style="max-width: 400px;">
  <Default />
  <br><br>
  
  <WithValues />
  <br><br>
  
  <Restricted />
  <br><br>
  
  <Compact />
  <br><br>
  
  <Disabled />
  <br><br>
  
  <WithError />
  <br><br>
  
  <NoClearButton />
  <br><br>
  
  <CustomPlaceholders />
  <br><br>
  
  <Interactive />
  <br><br>
  
  <ResponsiveMobile />
</div>

<!-- Display current values for debugging -->
<div style="margin-top: 2rem; padding: 1rem; background: #f5f5f5; border-radius: 8px; font-family: monospace; font-size: 12px;">
  <h4>Current Values (for debugging):</h4>
  <p>Default: {defaultStart} → {defaultEnd}</p>
  <p>Validated: {validatedStart} → {validatedEnd}</p>
  <p>Restricted: {restrictedStart} → {restrictedEnd}</p>
  <p>Compact: {compactStart} → {compactEnd}</p>
  <p>Error: {errorStart} → {errorEnd} {validationError ? `(${validationError})` : ''}</p>
  <p>Interactive: {interactiveStart} → {interactiveEnd}</p>
</div>