import { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';

const TIPOS_BASE = [
  'Comprimido',
  'Capsula',
  'Xarope / ml',
  'Gotas',
  'Injecao',
  'Pomada',
  'Creme',
  'Spray',
  'Adesivo',
  'Outro',
];

type Props = {
  value: string;
  onChange: (value: string) => void;
  accentColor: string;
  title?: string;
  description?: string;
  fontSize?: {
    title: number;
    body: number;
    caption: number;
  };
};

export default function CampoTipoMedicamento({
  value,
  onChange,
  accentColor,
  title = 'Tipo do medicamento',
  description = 'Escolha a apresentacao mais parecida com o medicamento.',
  fontSize,
}: Props) {
  const opcoes = useMemo(() => {
    const valorLimpo = value.trim();
    if (!valorLimpo || TIPOS_BASE.includes(valorLimpo)) {
      return TIPOS_BASE;
    }

    return [...TIPOS_BASE, valorLimpo];
  }, [value]);

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: '#12384c', fontSize: fontSize?.body ?? 16, fontWeight: '700', marginBottom: 6 }}>
        {title}
      </Text>
      <Text style={{ color: '#5f7f92', fontSize: fontSize?.caption ?? 13, marginBottom: 12 }}>
        {description}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
        {opcoes.map((tipo) => {
          const selecionado = value === tipo;

          return (
            <TouchableOpacity
              key={tipo}
              onPress={() => onChange(tipo)}
              style={{
                width: '50%',
                paddingHorizontal: 4,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  minHeight: 52,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: selecionado ? accentColor : '#d6e8ef',
                  backgroundColor: selecionado ? `${accentColor}18` : '#ffffff',
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Icon
                  name={selecionado ? 'square-check' : 'square'}
                  size={16}
                  color={selecionado ? accentColor : '#7a98a7'}
                  iconStyle={selecionado ? 'solid' : 'regular'}
                />
                <Text
                  style={{
                    color: selecionado ? accentColor : '#24505b',
                    fontSize: fontSize?.body ?? 15,
                    fontWeight: selecionado ? '700' : '600',
                    marginLeft: 10,
                    flex: 1,
                  }}
                >
                  {tipo}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
