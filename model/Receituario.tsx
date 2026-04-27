export class Receituario {
  public id: string;
  public medId: string;
  public dose: string;
  public intervaloHoras: number;
  public quantidadeDoses: number;
  public dataInicio: number;

  constructor(obj?: Partial<Receituario>) {
    this.id = obj?.id ?? "";
    this.medId = obj?.medId ?? "";
    this.dose = obj?.dose ?? "";
    this.intervaloHoras = obj?.intervaloHoras ?? 0;
    this.quantidadeDoses = obj?.quantidadeDoses ?? 0;
    this.dataInicio = obj?.dataInicio ?? Date.now();
  }

  toFirestore() {
    return {
      id: this.id,
      medId: this.medId,
      dose: this.dose,
      intervaloHoras: this.intervaloHoras,
      quantidadeDoses: this.quantidadeDoses,
      dataInicio: this.dataInicio,
    };
  }
}