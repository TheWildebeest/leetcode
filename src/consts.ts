export const SITE_TITLE = 'David Wildman | LeetCode';
export const SITE_DESCRIPTION = 'LeetCode practice and solutions';

export const PORTRAIT: { light: string; dark?: string } | undefined = {
  light: import.meta.env.BASE_URL + '/portrait-light.webp',
  dark: import.meta.env.BASE_URL + '/portrait-dark.webp',
};

export const LINKS = [
  { label: 'Email', href: 'mailto:david.m.wildman@gmail.com' },
];
