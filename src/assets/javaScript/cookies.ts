export const setCookie = (name: string, value: any, days: number) => {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = 'expires=' + d.toUTCString();
  document.cookie = name + '=' + value + ';' + expires + ';path=/';
};
