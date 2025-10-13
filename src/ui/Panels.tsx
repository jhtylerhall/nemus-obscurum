export type PanelAction = {
  label: string;
  onSelect: () => void;
};

export class Panels {
  private readonly element: HTMLDivElement;

  public constructor(actions: PanelAction[]) {
    this.element = document.createElement('div');
    this.element.style.position = 'fixed';
    this.element.style.bottom = '18px';
    this.element.style.left = '50%';
    this.element.style.transform = 'translateX(-50%)';
    this.element.style.display = 'flex';
    this.element.style.gap = '8px';
    document.body.appendChild(this.element);
    for (const action of actions) {
      const button = document.createElement('button');
      button.textContent = action.label;
      button.style.background = 'rgba(17, 31, 58, 0.7)';
      button.style.color = '#d8ecff';
      button.style.border = '1px solid rgba(84, 110, 255, 0.5)';
      button.style.padding = '8px 14px';
      button.style.borderRadius = '999px';
      button.style.cursor = 'pointer';
      button.addEventListener('click', () => action.onSelect());
      this.element.appendChild(button);
    }
  }
}
