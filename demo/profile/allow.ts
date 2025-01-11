export const schema = {
  model: 'profile',
  fields: [
    'select.id',
    'select.bio',
    'select.website',
    'select.user.select.id',
    'select.user.select.name',
    'where.user.name',
    'where.user.email',
    'where.AND[].bio',
    'where.OR[].website',
    'where.NOT[].bio',
    'where.bio.nullable',
  ],
};
