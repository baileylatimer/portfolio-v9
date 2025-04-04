interface Rule {
  required: () => Rule;
}

interface Selection {
  title: string;
  active: boolean;
}

export default {
  name: 'mission',
  title: 'Mission Section',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The section title (e.g., "ABOUT")',
      validation: (Rule: Rule) => Rule.required()
    },
    {
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Secondary', value: 'secondary'},
          ],
        },
      ],
      description: 'The main content text for the mission section',
      validation: (Rule: Rule) => Rule.required()
    },
    {
      name: 'active',
      title: 'Active',
      type: 'boolean',
      description: 'Set to true to display this mission section',
      initialValue: true
    },
    {
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Order in which this appears (lower numbers appear first)',
      initialValue: 1
    }
  ],
  preview: {
    select: {
      title: 'title',
      active: 'active'
    },
    prepare(selection: Selection) {
      const {title, active} = selection
      return {
        title: title,
        subtitle: active ? 'Active' : 'Inactive'
      }
    }
  }
}
