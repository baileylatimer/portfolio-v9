import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'experiment',
  title: 'Experiment',
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
      name: 'number',
      title: 'Number',
      type: 'number',
      description: 'Display number (e.g. 1 → shown as "001")',
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'thumbnail',
      title: 'Thumbnail',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{type: 'string'}],
      description: 'e.g. "typography", "3d", "motion", "generative"',
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Controls display order on the Lab page (lower = first)',
    }),
    defineField({
      name: 'scrollable',
      title: 'Scrollable',
      type: 'boolean',
      description: 'If false, the experiment is locked to 100vh (art-piece style). If true, normal scroll.',
      initialValue: false,
    }),
    defineField({
      name: 'uiTheme',
      title: 'UI Theme',
      type: 'string',
      description: 'Controls the color of the top-bar chrome (← LAB, song name, experiment number). Use "dark" for experiments with light backgrounds.',
      options: {
        list: [
          { title: 'Light (default — white text)', value: 'light' },
          { title: 'Dark (black text, for light backgrounds)', value: 'dark' },
        ],
        layout: 'radio',
      },
      initialValue: 'light',
    }),
    defineField({
      name: 'route',
      title: 'Route',
      type: 'string',
      description: 'The route file name (e.g. "kinetic-type" maps to /lab/kinetic-type)',
    }),
    defineField({
      name: 'songName',
      title: 'Song Name',
      type: 'string',
      description: 'Display name for the music player (e.g. "Midnight Drive"). Spaces become underscores in the UI.',
    }),
    defineField({
      name: 'songFile',
      title: 'Song File',
      type: 'file',
      options: { accept: 'audio/*' },
      description: 'MP3 or other audio file — hosted on Sanity CDN',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      number: 'number',
      media: 'thumbnail',
    },
    prepare({title, number, media}) {
      const num = number ? String(number).padStart(3, '0') : '???'
      return {
        title: `${num} — ${title}`,
        media,
      }
    },
  },
})
