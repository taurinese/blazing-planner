export function downloadText(fileName: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readFile(input: HTMLInputElement): Promise<{ name: string; text: string } | null> {
  const file = input.files?.[0];
  input.value = '';
  if (!file) return Promise.resolve(null);
  return file.text().then((text) => ({ name: file.name, text }));
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
