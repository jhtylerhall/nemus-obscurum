export type PanelAction = {
  label: string;
  onSelect: () => void;
};

export class Panels {
  private readonly root: HTMLElement;

  constructor(container: HTMLElement, actions: PanelAction[]) {
    this.root = document.createElement('div');
    this.root.style.position = 'absolute';
    this.root.style.bottom = '1.5rem';
    this.root.style.left = '50%';
    this.root.style.transform = 'translateX(-50%)';
    this.root.style.display = 'flex';
    this.root.style.gap = '0.75rem';
    this.root.style.pointerEvents = 'auto';
    container.appendChild(this.root);

    actions.forEach((action) => {
      const button = document.createElement('button');
      button.textContent = action.label;
      button.style.padding = '0.5rem 1rem';
      button.style.border = '1px solid rgba(148, 163, 184, 0.5)';
      button.style.background = 'rgba(15, 23, 42, 0.6)';
      button.style.color = '#f8fafc';
      button.style.borderRadius = '999px';
      button.style.fontSize = '0.9rem';
      button.style.letterSpacing = '0.05em';
      button.style.cursor = 'pointer';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        action.onSelect();
      });
      this.root.appendChild(button);
    });
  }
}
