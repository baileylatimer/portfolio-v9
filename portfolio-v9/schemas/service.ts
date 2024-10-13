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
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Use this to control the order of services in the accordion',
    },
  ],
}
