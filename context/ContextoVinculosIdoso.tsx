import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import firebase from "firebase/compat/app";
import { auth, firestore } from "../firebase";

type TipoUsuario = "idoso" | "normal";
type SomNotificacao = "padrao" | "suave" | "alerta";

type Vinculado = {
  id: string;
  nome: string;
};

type ContextoVinculos = {
  loading: boolean;
  tipoUsuario: TipoUsuario;
  codigoVinculo: string;
  idosoPodeGerenciarMedicamentos: boolean;
  idosoPodeEditarExcluirMedicamentos: boolean;
  notificacoesAtivas: boolean;
  somNotificacao: SomNotificacao;
  usuarioSelecionadoId: string | null;
  usuarioSelecionadoNome: string;
  visualizandoVinculado: boolean;
  vinculados: Vinculado[];
  selecionarUsuario: (id: string, nome: string) => void;
  vincularPorCodigo: (codigo: string) => Promise<{ id: string; nome: string }>;
  gerarNovoCodigo: () => Promise<string>;
  desvincularIdoso: (idosoId: string) => Promise<void>;
  atualizarPermissaoGerenciarMedicamentos: (permitir: boolean) => Promise<void>;
  atualizarPermissaoEditarExcluirMedicamentos: (permitir: boolean) => Promise<void>;
  atualizarNotificacoesAtivas: (ativas: boolean) => Promise<void>;
  atualizarSomNotificacao: (som: SomNotificacao) => Promise<void>;
};

const VinculosContext = createContext<ContextoVinculos | undefined>(undefined);

const gerarCodigo = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export function VinculosIdosoProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>("idoso");
  const [codigoVinculo, setCodigoVinculo] = useState("");
  const [idosoPodeGerenciarMedicamentos, setIdosoPodeGerenciarMedicamentos] = useState(false);
  const [idosoPodeEditarExcluirMedicamentos, setIdosoPodeEditarExcluirMedicamentos] = useState(false);
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(true);
  const [somNotificacao, setSomNotificacao] = useState<SomNotificacao>("padrao");
  const [usuarioLogadoId, setUsuarioLogadoId] = useState<string | null>(null);
  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = useState<string | null>(null);
  const [usuarioSelecionadoNome, setUsuarioSelecionadoNome] = useState("Minha conta");
  const [vinculados, setVinculados] = useState<Vinculado[]>([]);

  useEffect(() => {
    let unsubscribePerfil: (() => void) | undefined;
    let unsubscribeVinculados: (() => void) | undefined;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (unsubscribePerfil) {
        unsubscribePerfil();
        unsubscribePerfil = undefined;
      }
      if (unsubscribeVinculados) {
        unsubscribeVinculados();
        unsubscribeVinculados = undefined;
      }

      if (user == null) {
        setLoading(false);
        setUsuarioLogadoId(null);
        setUsuarioSelecionadoId(null);
        setUsuarioSelecionadoNome("Minha conta");
        setTipoUsuario("idoso");
        setCodigoVinculo("");
        setIdosoPodeGerenciarMedicamentos(false);
        setIdosoPodeEditarExcluirMedicamentos(false);
        setNotificacoesAtivas(true);
        setVinculados([]);
        return;
      }

      setLoading(true);
      setUsuarioLogadoId(user.uid);
      setUsuarioSelecionadoId(user.uid);
      setUsuarioSelecionadoNome("Minha conta");

      const refPerfil = firestore.collection("Usuario").doc(user.uid);

      unsubscribePerfil = refPerfil.onSnapshot(async (doc) => {
        const data = doc.data() || {};

        if (Object.prototype.hasOwnProperty.call(data, "senha")) {
          await refPerfil.set(
            { senha: firebase.firestore.FieldValue.delete() },
            { merge: true }
          );
        }

        const tipo = data.tipo === "idoso" ? "idoso" : "normal";
        setTipoUsuario(tipo);
        setIdosoPodeGerenciarMedicamentos(data.idosoPodeGerenciarMedicamentos === true);
        setIdosoPodeEditarExcluirMedicamentos(data.idosoPodeEditarExcluirMedicamentos === true);
        setNotificacoesAtivas(data.notificacoesAtivas !== false);
        const somSalvo = data.somNotificacao;
        if (somSalvo === "suave" || somSalvo === "alerta" || somSalvo === "padrao") {
          setSomNotificacao(somSalvo);
        } else {
          setSomNotificacao("padrao");
          await refPerfil.set({ somNotificacao: "padrao" }, { merge: true });
        }

        const codigoAtual = data.codigoVinculo;
        if (typeof codigoAtual === "string" && codigoAtual.trim().length >= 4) {
          setCodigoVinculo(codigoAtual.trim().toUpperCase());
        } else {
          const novoCodigo = gerarCodigo();
          await refPerfil.set({ codigoVinculo: novoCodigo }, { merge: true });
          setCodigoVinculo(novoCodigo);
        }

        setLoading(false);
      }, () => {
        setLoading(false);
      });

      unsubscribeVinculados = refPerfil.collection("Vinculados").onSnapshot((snap) => {
        const lista: Vinculado[] = snap.docs.map((d) => ({
          id: d.id,
          nome: (d.data().nome as string) || "Idoso",
        }));

        setVinculados(lista);

        setUsuarioSelecionadoId((anterior) => {
          if (anterior == null || anterior === user.uid) return user.uid;
          const aindaExiste = lista.some((v) => v.id === anterior);
          if (aindaExiste) return anterior;
          setUsuarioSelecionadoNome("Minha conta");
          return user.uid;
        });
      });
    });

    return () => {
      if (unsubscribePerfil) unsubscribePerfil();
      if (unsubscribeVinculados) unsubscribeVinculados();
      unsubscribeAuth();
    };
  }, []);

  const selecionarUsuario = (id: string, nome: string) => {
    setUsuarioSelecionadoId(id);
    setUsuarioSelecionadoNome(nome);
  };

  const vincularPorCodigo = async (codigoBruto: string) => {
    const uid = auth.currentUser?.uid;
    if (uid == null) throw new Error("Usuario nao autenticado.");

    const codigo = codigoBruto.trim().toUpperCase();
    if (codigo.length < 4) throw new Error("Codigo invalido.");

    const snap = await firestore
      .collection("Usuario")
      .where("codigoVinculo", "==", codigo)
      .limit(1)
      .get();

    if (snap.empty) throw new Error("Codigo nao encontrado.");

    const doc = snap.docs[0];
    const alvoId = doc.id;
    const data = doc.data() || {};
    const tipoAlvo = data.tipo === "idoso" ? "idoso" : "normal";

    if (alvoId === uid) throw new Error("Nao e possivel vincular seu proprio codigo.");
    if (tipoAlvo !== "idoso") throw new Error("Esse codigo nao pertence a um usuario idoso.");

    const nomeAlvo = (data.nome as string) || "Idoso";

    await firestore
      .collection("Usuario")
      .doc(uid)
      .collection("Vinculados")
      .doc(alvoId)
      .set(
        {
          idosoId: alvoId,
          nome: nomeAlvo,
          codigoVinculo: codigo,
          vinculadoEm: Date.now(),
        },
        { merge: true }
      );

    return { id: alvoId, nome: nomeAlvo };
  };

  const gerarNovoCodigo = async () => {
    const uid = auth.currentUser?.uid;
    if (uid == null) throw new Error("Usuario nao autenticado.");

    const novo = gerarCodigo();
    await firestore.collection("Usuario").doc(uid).set({ codigoVinculo: novo }, { merge: true });
    setCodigoVinculo(novo);
    return novo;
  };

  const atualizarPermissaoGerenciarMedicamentos = async (permitir: boolean) => {
    const uid = auth.currentUser?.uid;
    if (uid == null) throw new Error("Usuario nao autenticado.");

    await firestore
      .collection("Usuario")
      .doc(uid)
      .set({ idosoPodeGerenciarMedicamentos: permitir }, { merge: true });

    setIdosoPodeGerenciarMedicamentos(permitir);

    if (!permitir) {
      await atualizarPermissaoEditarExcluirMedicamentos(false);
    }
  };

  const atualizarPermissaoEditarExcluirMedicamentos = async (permitir: boolean) => {
    const uid = auth.currentUser?.uid;
    if (uid == null) throw new Error("Usuario nao autenticado.");

    await firestore
      .collection("Usuario")
      .doc(uid)
      .set({ idosoPodeEditarExcluirMedicamentos: permitir }, { merge: true });

    setIdosoPodeEditarExcluirMedicamentos(permitir);
  };

  const atualizarNotificacoesAtivas = async (ativas: boolean) => {
    const uid = auth.currentUser?.uid;
    if (uid == null) throw new Error("Usuario nao autenticado.");

    await firestore
      .collection("Usuario")
      .doc(uid)
      .set({ notificacoesAtivas: ativas }, { merge: true });

    setNotificacoesAtivas(ativas);
  };

  const atualizarSomNotificacao = async (som: SomNotificacao) => {
    const uid = auth.currentUser?.uid;
    if (uid == null) throw new Error("Usuario nao autenticado.");

    await firestore
      .collection("Usuario")
      .doc(uid)
      .set({ somNotificacao: som }, { merge: true });

    setSomNotificacao(som);
  };

  const desvincularIdoso = async (idosoId: string) => {
    const uid = auth.currentUser?.uid;
    if (uid == null) throw new Error("Usuario nao autenticado.");

    await firestore
      .collection("Usuario")
      .doc(uid)
      .collection("Vinculados")
      .doc(idosoId)
      .delete();

    // Se estava selecionado, volta para "Minha conta"
    if (usuarioSelecionadoId === idosoId) {
      setUsuarioSelecionadoId(uid);
      setUsuarioSelecionadoNome("Minha conta");
    }
  };

  const value = useMemo<ContextoVinculos>(() => {
    const visualizandoVinculado =
      usuarioLogadoId != null &&
      usuarioSelecionadoId != null &&
      usuarioSelecionadoId !== usuarioLogadoId;

    return {
      loading,
      tipoUsuario,
      codigoVinculo,
      idosoPodeGerenciarMedicamentos,
      idosoPodeEditarExcluirMedicamentos,
      notificacoesAtivas,
      somNotificacao,
      usuarioSelecionadoId,
      usuarioSelecionadoNome,
      visualizandoVinculado,
      vinculados,
      selecionarUsuario,
      vincularPorCodigo,
      gerarNovoCodigo,
      desvincularIdoso,
      atualizarPermissaoGerenciarMedicamentos,
      atualizarPermissaoEditarExcluirMedicamentos,
      atualizarNotificacoesAtivas,
      atualizarSomNotificacao,
    };
  }, [
    loading,
    tipoUsuario,
    codigoVinculo,
    idosoPodeGerenciarMedicamentos,
    idosoPodeEditarExcluirMedicamentos,
    notificacoesAtivas,
    somNotificacao,
    usuarioSelecionadoId,
    usuarioSelecionadoNome,
    usuarioLogadoId,
    vinculados,
  ]);

  return <VinculosContext.Provider value={value}>{children}</VinculosContext.Provider>;
}

export function useVinculosIdoso() {
  const ctx = useContext(VinculosContext);
  if (ctx == null) throw new Error("useVinculosIdoso deve ser usado dentro de VinculosIdosoProvider");
  return ctx;
}
