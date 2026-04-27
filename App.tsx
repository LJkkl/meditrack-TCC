import React from 'react';
import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStackParamList } from './types/navigation';
import { AccessibilityModeProvider } from './context/ContextoModoAcessibilidade';
import { FontSizeProvider } from './context/ContextoTamanhoFonte';
import GerenciadorNotificacoes from './components/GerenciadorNotificacoes';
import { VinculosIdosoProvider } from './context/ContextoVinculosIdoso';
import TelaAbertura from './components/TelaAbertura';

// Screens
import Login from './screens/Login';
import Register from './screens/Register';
import Menu from './screens/Menu';
import Agenda from './screens/Agenda';
import EditarPerfil from './screens/EditarPerfil';
import EditarMedicamento from './screens/MedicamentoEditar';
import ListarMedicamento from './screens/MedicamentoListar';
import MedicamentoRec from './screens/MedicamentoRec';
import MedicamentoRes from './screens/MedicamentoRes';
import Medicamento from './screens/Medicamento';
import MedicamentoPer from './screens/MedicamentoPerfil';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [mostrarAbertura, setMostrarAbertura] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMostrarAbertura(false);
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <AccessibilityModeProvider>
        <FontSizeProvider>
          <VinculosIdosoProvider>
            {mostrarAbertura ? (
              <TelaAbertura />
            ) : (
              <>
                <GerenciadorNotificacoes />
                <NavigationContainer>
                  <Stack.Navigator id="root-stack">
                    <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
                    <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
                    <Stack.Screen name="Menu" component={Menu} options={{ headerShown: false }} />
                    <Stack.Screen name="Agenda" component={Agenda} options={{ headerShown: false }} />
                    <Stack.Screen name="EditarPerfil" component={EditarPerfil} options={{ headerShown: false }} />
                    <Stack.Screen name="EditarMedicamento" component={EditarMedicamento} options={{ headerShown: false }} />
                    <Stack.Screen name="ListarMedicamento" component={ListarMedicamento} options={{ headerShown: false }} />
                    <Stack.Screen name="MedicamentoRec" component={MedicamentoRec} options={{ headerShown: false }} />
                    <Stack.Screen name="MedicamentoRes" component={MedicamentoRes} options={{ headerShown: false }} />
                    <Stack.Screen name="Medicamento" component={Medicamento} options={{ headerShown: false }} />
                    <Stack.Screen name="MedicamentoPer" component={MedicamentoPer} options={{ headerShown: false }} />
                  </Stack.Navigator>
                </NavigationContainer>
              </>
            )}
          </VinculosIdosoProvider>
        </FontSizeProvider>
      </AccessibilityModeProvider>
    </SafeAreaProvider>
  );
}
