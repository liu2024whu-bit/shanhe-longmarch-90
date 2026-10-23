export const starPath='m24 5 4.5 12 13 .6-10.1 8.2 3.3 12.5L24 31.2l-10.7 7.1 3.3-12.5L6.5 17.6l13-.6Z';
export const capSymbol=`<svg viewBox="0 0 52 44" aria-hidden="true"><path d="M8 26 11 14Q25 3 42 14l3 12Z" fill="#788975" stroke="#f8f0dc" stroke-width="2"/><path d="M7 25Q26 20 46 25l-3 7Q25 38 8 31Z" fill="#485b4d" stroke="#f8f0dc" stroke-width="2"/><path d="m27 12 1.5 4.3 4.5.2-3.5 2.8 1.1 4.3L27 21l-3.7 2.6 1.2-4.3-3.5-2.8 4.5-.2Z" fill="#b43229"/><path d="M13 31Q28 43 43 31" fill="#a4b29b" stroke="#f8f0dc" stroke-width="2"/></svg>`;
export function objectArt(kind='flag'){
 const drawings={
  hook:'<path d="M52 11v45c0 27-34 27-34 3V45m0 0-8 11m8-11 10 8"/><circle cx="52" cy="10" r="5"/>',
  matches:'<path d="m22 58 20-39m-8 44 20-40M46 67l17-35"/><path class="art-fill" d="M37 19c-6-9 9-19 6-8 7 4 1 12-6 8ZM49 23c-5-8 9-16 6-7 7 4 1 12-6 7ZM59 32c-6-9 8-17 6-8 7 4 1 12-6 8Z"/>',
  quilt:'<path d="M15 15h51v51H15Z M15 32h51M15 49h51M32 15v51M49 15v51m-34 0 10-8m7 8 10-8m7 8 10-8"/>',
  belt:'<path d="M12 29h20v26H12Zm6 6h8v14h-8Zm14-2h37v18H32m8-18v18m10-12h.1m9 0h.1M64 33l7 6-5 5 5 7"/>',
  bridge:'<path d="M9 17v45m60-45v45M9 26q29 35 60 0M9 35q29 35 60 0M20 37v12m12-5v12m13-11v12m12-20v13M6 64q9-5 18 0t18 0 18 0 15 0"/>',
  boat:'<path d="M9 48h61L58 61H23Zm13-6V20h31v22m-15 0V11M7 68q10-5 20 0t20 0 20 0M38 13l18 19H38"/>',
  mountain:'<path d="m7 65 24-49 17 30 9-19 20 38ZM22 34l10 5 7-10m10 18 8 5 7-6"/>',
  lamp:'<path d="M22 65h37M28 59h25l-3-27H32Zm4-27 1-12h16l1 12M32 20q-3-15 9-15t8 15M40 52V39m-4 13h8"/>',
  paper:'<path d="M18 10h45v58H18Zm8 10h29M26 29h29M26 37h12v15H26Zm20 0h9m-9 8h9m-9 8h9M26 59h29"/>',
  bowl:'<path d="M12 39h58Q65 65 41 65T12 39ZM19 39l6-11m39 11-6-11M28 17l7 8m20-8-7 8M33 69h17"/>',
  flag:'<path d="M17 72V10m0 3q15-13 30 0t28 0v31q-15 13-28 0t-30 0"/><path class="art-fill" d="m39 16 2 6 6 .3-4.7 3.7 1.6 6-4.9-3.4-5 3.4 1.5-6-4.7-3.7 6.2-.3Z"/>'
 };
 return `<svg class="object-art" viewBox="0 0 84 84" aria-hidden="true">${drawings[kind]||drawings.flag}</svg>`;
}
