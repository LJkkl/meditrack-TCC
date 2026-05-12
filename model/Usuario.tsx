export class Usuario {
  public id: string;
  public nome: string;
  public email: string;
  public fone: string;
  public tipo: "normal" | "idoso";
  public modoInterface: "normal" | "idoso";
  public tamanhoFonte: "Pequeno" | "Medio" | "Grande";
  public idosoPodeGerenciarMedicamentos: boolean;
  public idosoPodeEditarExcluirMedicamentos: boolean;
  public notificacoesAtivas: boolean;
  public somNotificacao: "padrao" | "suave" | "alerta";

  constructor(obj?: Partial<Usuario>) {
    this.id = obj?.id ?? "";
    this.nome = obj?.nome ?? "";
    this.email = obj?.email ?? "";
    this.fone = obj?.fone ?? "";
    this.tipo = obj?.tipo ?? "normal";
    this.modoInterface = obj?.modoInterface ?? "normal";
    this.tamanhoFonte = obj?.tamanhoFonte ?? "Medio";
    this.idosoPodeGerenciarMedicamentos = obj?.idosoPodeGerenciarMedicamentos ?? false;
    this.idosoPodeEditarExcluirMedicamentos = obj?.idosoPodeEditarExcluirMedicamentos ?? false;
    this.notificacoesAtivas = obj?.notificacoesAtivas ?? true;
    this.somNotificacao = obj?.somNotificacao ?? "padrao";
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
            "idosoPodeEditarExcluirMedicamentos"  :   "${this.idosoPodeEditarExcluirMedicamentos}",
            "notificacoesAtivas"  :   "${this.notificacoesAtivas}",
            "somNotificacao"  :   "${this.somNotificacao}"
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
            idosoPodeEditarExcluirMedicamentos: this.idosoPodeEditarExcluirMedicamentos,
            notificacoesAtivas: this.notificacoesAtivas,
            somNotificacao: this.somNotificacao
        }
        return usuario
    }


}
