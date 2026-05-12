import { NavigatorScreenParams } from '@react-navigation/native';

export type MedicamentoItem = {
  id: string;
  nomeComercial: string;
  tipoApresentacao: string;
  principioAtivo: string;
  foto?: string;
  criadoEm?: number;
  idosoPodeEditarExcluir?: boolean;
};

export type MedicamentoBuscaItem = {
  id: string;
  nome: string;
  tipo?: string;
  principio?: string;
  foto?: string;
  idosoPodeEditarExcluir?: boolean;
};

export type ReceituarioForm = {
  dose: string;
  intervaloHoras: string;
  quantidadeDoses: string;
  dataInicio: number;
  idosoPodeEditarExcluir?: boolean;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Menu: NavigatorScreenParams<MenuTabParamList> | undefined;
  Agenda: undefined;
  EditarPerfil: undefined;
  ListarMedicamento: undefined;
  Medicamento: undefined;
  MedicamentoRec: undefined;
  MedicamentoRes: {
    medicamento: MedicamentoBuscaItem;
    receituario: ReceituarioForm;
  };
  MedicamentoPer: {
    medicamento: MedicamentoItem;
  };
  EditarMedicamento: {
    medId: string;
  };
};

export type MenuTabParamList = {
  Home: undefined;
  MedicamentoListar: undefined;
  MedicamentoRec: undefined;
  IdosoMedicamento: undefined;
  Historico: undefined;
  Perfil: undefined;
};
