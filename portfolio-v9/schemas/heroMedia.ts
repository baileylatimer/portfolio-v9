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
      name: 'posterImage',
      title: 'Poster Image',
      type: 'image',
      description: 'Fast-loading image (200KB max) shown while video loads. Use first frame of video for seamless transition.',
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.custom((posterImage, context) => {
        // Simplified validation - recommend poster image for all media
        if (!posterImage) {
          return 'Poster image is recommended for fast loading performance';
        }
        
        return true;
      }),
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
