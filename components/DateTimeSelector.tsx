import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DateTimeSelectorProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  fontScale: any;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
}

function ajustarParaMinimo(data: Date, minimumDate?: Date) {
  if (!minimumDate) {
    return { date: data, ajustada: false };
  }

  if (data.getTime() >= minimumDate.getTime()) {
    return { date: data, ajustada: false };
  }

  return { date: new Date(minimumDate), ajustada: true };
}

export default function DateTimeSelector({
  label,
  value,
  onChange,
  fontScale,
  mode = 'datetime',
  minimumDate,
}: DateTimeSelectorProps) {
  const [mostrarPickerData, setMostrarPickerData] = useState(false);
  const [mostrarPickerHora, setMostrarPickerHora] = useState(false);
  const [dataTemp, setDataTemp] = useState(value);

  useEffect(() => {
    setDataTemp(value);
  }, [value]);

  const aplicarData = (novaData: Date) => {
    const { date, ajustada } = ajustarParaMinimo(novaData, minimumDate);
    setDataTemp(date);
    onChange(date);

    if (ajustada) {
      Alert.alert('Horário ajustado', 'Não é possível escolher um horário anterior ao atual neste fluxo.');
    }
  };

  const handleMudarData = (_event: any, selectedDate?: Date) => {
    setMostrarPickerData(false);

    if (!selectedDate) {
      return;
    }

    const novaData = new Date(dataTemp);
    novaData.setFullYear(selectedDate.getFullYear());
    novaData.setMonth(selectedDate.getMonth());
    novaData.setDate(selectedDate.getDate());
    aplicarData(novaData);
  };

  const handleMudarHora = (_event: any, selectedDate?: Date) => {
    setMostrarPickerHora(false);

    if (!selectedDate) {
      return;
    }

    const novaData = new Date(dataTemp);
    novaData.setHours(selectedDate.getHours());
    novaData.setMinutes(selectedDate.getMinutes());
    novaData.setSeconds(0);
    novaData.setMilliseconds(0);
    aplicarData(novaData);
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: fontScale.caption, color: '#5f7f92', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </Text>

      {(mode === 'date' || mode === 'datetime') && (
        <TouchableOpacity
          onPress={() => setMostrarPickerData(true)}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: '#cae0ef',
            borderRadius: 8,
            backgroundColor: '#f4fbff',
            marginBottom: mode === 'datetime' ? 8 : 0,
          }}
        >
          <Text style={{ color: '#12384c', fontSize: fontScale.body, fontWeight: '600' }}>
            Data: {dataTemp.toLocaleDateString('pt-BR')}
          </Text>
        </TouchableOpacity>
      )}

      {(mode === 'time' || mode === 'datetime') && (
        <TouchableOpacity
          onPress={() => setMostrarPickerHora(true)}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: '#cae0ef',
            borderRadius: 8,
            backgroundColor: '#f4fbff',
          }}
        >
          <Text style={{ color: '#12384c', fontSize: fontScale.body, fontWeight: '600' }}>
            Hora: {dataTemp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
      )}

      {mostrarPickerData && (
        <DateTimePicker
          value={dataTemp}
          mode="date"
          display="spinner"
          onChange={handleMudarData}
          locale="pt-BR"
          minimumDate={minimumDate}
        />
      )}

      {mostrarPickerHora && (
        <DateTimePicker
          value={dataTemp}
          mode="time"
          display="spinner"
          onChange={handleMudarHora}
          is24Hour
          locale="pt-BR"
        />
      )}
    </View>
  );
}
