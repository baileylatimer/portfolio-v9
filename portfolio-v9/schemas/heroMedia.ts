import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'heroMedia',
  title: 'Hero Media',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'file',
      options: {
        accept: 'image/*,video/*'
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'active',
      title: 'Active',
      type: 'boolean',
      description: 'Only one hero media should be active at a time',
      initialValue: false,
    })
  ],
  preview: {
    select: {
      title: 'title',
      media: 'media'
    }
  }
})
