import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'client',
      title: 'Client',
      type: 'string',
    }),
    defineField({
      name: 'projectDate',
      title: 'Project Date',
      type: 'date',
    }),
    defineField({
      name: 'launchingSoon',
      title: 'Launching Soon',
      type: 'boolean',
      description: 'Check this if the project is launching soon',
    }),
    defineField({
      name: 'technologies',
      title: 'Technologies Used',
      type: 'array',
      of: [{type: 'string'}],
    }),
    defineField({
      name: 'services',
      title: 'Services',
      type: 'array',
      of: [{type: 'string'}],
    }),
    defineField({
      name: 'industry',
      title: 'Industry',
      type: 'array',
      of: [{type: 'string'}],
    }),
    defineField({
      name: 'mainImage',
      title: 'Main image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'mobileImage',
      title: 'Mobile image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'challenge',
      title: 'Challenge',
      type: 'text',
    }),
    defineField({
      name: 'solution',
      title: 'Solution',
      type: 'array',
      of: [{type: 'block'}],
    }),
    defineField({
      name: 'websiteUrl',
      title: 'Website URL',
      type: 'url',
    }),
    defineField({
      name: 'columns',
      title: 'Columns',
      type: 'number',
      validation: (Rule) => Rule.min(1).max(4).integer(),
      options: {
        list: [
          {title: '1/3 width', value: 1},
          {title: '1/2 width', value: 2},
          {title: '2/3 width', value: 3},
          {title: 'Full width', value: 4},
        ],
      },
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
    }),
    defineField({
      name: 'mediaBlocks',
      title: 'Media Blocks',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'mediaBlock',
          fields: [
            {
              name: 'name',
              title: 'Name',
              type: 'string',
              description: 'Internal name for this media block (not displayed on the website)',
            },
            {
              name: 'media',
              title: 'Media',
              type: 'file',
              options: {
                accept: 'image/*,video/*'
              }
            },
            {
              name: 'columns',
              title: 'Columns',
              type: 'number',
              validation: (Rule) => Rule.min(1).max(4).integer(),
              options: {
                list: [
                  {title: '1/3 width', value: 1},
                  {title: '1/2 width', value: 2},
                  {title: '2/3 width', value: 3},
                  {title: 'Full width', value: 4},
                ],
              },
            },
          ]
        }
      ]
    }),
  ],
})
