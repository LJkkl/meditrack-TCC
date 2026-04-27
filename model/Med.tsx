export class Med {
  public id: string;
  public nomeComercial: string;
  public tipoApresentacao: string;
  public principioAtivo: string;
  public foto?: string;

  constructor(obj?: Partial<Med>) {
    this.id = obj?.id ?? "";
    this.nomeComercial = obj?.nomeComercial ?? "";
    this.tipoApresentacao = obj?.tipoApresentacao ?? "";
    this.principioAtivo = obj?.principioAtivo ?? "";
    this.foto = obj?.foto;
  }
  toString() {
        const objeto = `{
            "id"    :   "${this.id}",
            "nomeComercial"  :   "${this.nomeComercial}",
            "tipoApresentacao"  :   "${this.tipoApresentacao}" ,
            "principioAtivo"  :   "${this.principioAtivo}",
            "foto"  :   "${this.foto}", 
        }`
        return objeto
    }

  toFirestore() {
    const med: any = {
      id: this.id,
      nomeComercial: this.nomeComercial,
      tipoApresentacao: this.tipoApresentacao,
      principioAtivo: this.principioAtivo,
    };

    if (this.foto) med.foto = this.foto;

    return med;
  }
}

    
