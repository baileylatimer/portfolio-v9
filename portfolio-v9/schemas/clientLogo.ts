export default {
  name: 'clientLogo',
  title: 'Client Logo',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Client Name',
      type: 'string',
      description: 'Name of the client (for organization and alt text)',
    },
    {
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: {
        hotspot: true,
      },
    },
    {
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Order in which the logo should appear (lower numbers appear first)',
    },
    {
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
      readOnly: true,
    },
  ],
  orderings: [
    {
      title: 'Logo Order',
      name: 'logoOrder',
      by: [
        {field: 'order', direction: 'asc'}
      ]
    },
  ],
}
