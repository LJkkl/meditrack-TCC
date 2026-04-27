export class Historico {
  public id: string;
  public medId: string;
  public nomeMed: string;
  public previstoPara: number;
  public tomadoEm?: number;
  public status: "pendente" | "tomado";

  constructor(obj?: Partial<Historico>) {
    this.id = obj?.id ?? "";
    this.medId = obj?.medId ?? "";
    this.nomeMed = obj?.nomeMed ?? "";
    this.previstoPara = obj?.previstoPara ?? 0;
    this.tomadoEm = obj?.tomadoEm;
    this.status = obj?.status ?? "pendente";
  }

  toFirestore() {
    return {
      id: this.id,
      medId: this.medId,
      nomeMed: this.nomeMed,
      previstoPara: this.previstoPara,
      tomadoEm: this.tomadoEm ?? null,
      status: this.status
    };
  }
}


  
