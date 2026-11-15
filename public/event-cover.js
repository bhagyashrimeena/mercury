export function mountEventCover(form) {
  const input = form.querySelector('#organizer-cover');
  const preview = form.querySelector('#event-cover-preview');
  const remove = form.querySelector('#remove-event-cover');
  const status = form.querySelector('#event-cover-status');
  let objectUrl;
  const refresh = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    const file = input.files[0];
    const saved = form.elements.coverImage.value;
    const valid = file && file.size <= 768000 && ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
    status.textContent = file && !valid ? 'Choose a PNG, JPEG or WebP image under 750 KB.' : '';
    preview.hidden = !valid && !saved;
    remove.hidden = !file && !saved;
    if (valid) {
      objectUrl = URL.createObjectURL(file); preview.src = objectUrl;
      preview.onload = () => { if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = null; };
    }
    else if (saved) preview.src = saved;
    else preview.removeAttribute('src');
  };
  input.addEventListener('change', refresh);
  remove.addEventListener('click', () => {
    input.value = '';
    form.elements.coverImage.value = '';
    refresh();
    input.dispatchEvent(new Event('change', {bubbles:true}));
  });
  refresh();
  return {refresh};
}
