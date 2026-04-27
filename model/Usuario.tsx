export class Usuario {
  public id: string;
  public nome: string;
  public email: string;
  public fone: string;
  public tipo: "normal" | "idoso";
  public modoInterface: "normal" | "idoso";
  public tamanhoFonte: "Pequeno" | "Medio" | "Grande";
  public idosoPodeGerenciarMedicamentos: boolean;
  public notificacoesAtivas: boolean;

  constructor(obj?: Partial<Usuario>) {
    this.id = obj?.id ?? "";
    this.nome = obj?.nome ?? "";
    this.email = obj?.email ?? "";
    this.fone = obj?.fone ?? "";
    this.tipo = obj?.tipo ?? "normal";
    this.modoInterface = obj?.modoInterface ?? "normal";
    this.tamanhoFonte = obj?.tamanhoFonte ?? "Medio";
    this.idosoPodeGerenciarMedicamentos = obj?.idosoPodeGerenciarMedicamentos ?? false;
    this.notificacoesAtivas = obj?.notificacoesAtivas ?? true;
  }

    toString() {
        const objeto = `{
            "id"    :   "${this.id}",
            "nome"  :   "${this.nome}",
            "email" :   "${this.email}",
            "fone"  :   "${this.fone}",
            "tipo"  :   "${this.tipo}",
            "modoInterface"  :   "${this.modoInterface}",
            "tamanhoFonte"  :   "${this.tamanhoFonte}",
            "idosoPodeGerenciarMedicamentos"  :   "${this.idosoPodeGerenciarMedicamentos}",
            "notificacoesAtivas"  :   "${this.notificacoesAtivas}"
        }`
        return objeto
    }

    toFirestore(){
        const usuario = {
            id      : this.id,
            nome    : this.nome,
            email   : this.email,
            fone    : this.fone,
            tipo    : this.tipo,
            modoInterface: this.modoInterface,
            tamanhoFonte: this.tamanhoFonte,
            idosoPodeGerenciarMedicamentos: this.idosoPodeGerenciarMedicamentos,
            notificacoesAtivas: this.notificacoesAtivas
        }
        return usuario
    }


}
