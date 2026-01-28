export default {
  name: 'secretAbout',
  title: 'Secret About',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [{ type: 'block' }],
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {
        hotspot: true,
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'armorImage',
      title: 'Armor Image (Easter Egg)',
      description: 'Alternate image shown when shot - you in medieval armor!',
      type: 'image',
      options: {
        hotspot: true,
      },
    },
  ],
};
