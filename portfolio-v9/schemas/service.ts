interface MediaField {
  type?: 'image' | 'video';
}

export default {
  name: 'service',
  title: 'Service',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
    },
    {
      name: 'content',
      title: 'Content',
      type: 'text',
    },
    {
      name: 'media',
      title: 'Media',
      type: 'object',
      fields: [
        {
          name: 'type',
          title: 'Media Type',
          type: 'string',
          options: {
            list: [
              { title: 'Image', value: 'image' },
              { title: 'Video', value: 'video' }
            ]
          }
        },
        {
          name: 'image',
          title: 'Image',
          type: 'image',
          hidden: ({ parent }: { parent: MediaField }) => parent?.type !== 'image',
          options: {
            hotspot: true
          }
        },
        {
          name: 'video',
          title: 'Video',
          type: 'file',
          hidden: ({ parent }: { parent: MediaField }) => parent?.type !== 'video',
          options: {
            accept: 'video/*'
          }
        },
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative Text',
          description: 'Important for SEO and accessibility'
        }
      ],
      description: 'Upload an image or video (1:1 aspect ratio recommended)'
    },
    {
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Use this to control the order of services in the accordion',
    },
  ],
}
