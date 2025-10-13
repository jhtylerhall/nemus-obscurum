export class HUD {
  private readonly element: HTMLDivElement;

  public constructor() {
    this.element = document.createElement('div');
    this.element.style.position = 'fixed';
    this.element.style.top = '12px';
    this.element.style.right = '12px';
    this.element.style.padding = '8px 12px';
    this.element.style.background = 'rgba(10, 18, 36, 0.6)';
    this.element.style.borderRadius = '8px';
    this.element.style.fontSize = '12px';
    this.element.style.lineHeight = '1.4';
    document.body.appendChild(this.element);
  }

  public update(info: { population: number; techLevel: number; energyUse: number }): void {
    this.element.innerHTML = `
      <div><strong>Population:</strong> ${info.population.toFixed(2)} B</div>
      <div><strong>Tech:</strong> ${info.techLevel.toFixed(2)}</div>
      <div><strong>Energy:</strong> ${(info.energyUse * 100).toFixed(1)}%</div>
    `;
  }
}
