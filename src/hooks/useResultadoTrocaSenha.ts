import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDialogo } from '../contexts/DialogoContext';
import { resultadosTrocaSenha } from '../services/resultadosTrocaSenha';

// Somente uma tela de perfil focada, da mesma conta, consome o resultado tardio.
export function useResultadoTrocaSenha(usuarioId: string | undefined) {
    const { alertar } = useDialogo();
    useFocusEffect(useCallback(() => {
        if (!usuarioId) return;
        const mostrarPendente = () => {
            const resultado = resultadosTrocaSenha.consumir(usuarioId);
            if (resultado) alertar(resultado.titulo, resultado.mensagem, undefined, resultado.tipo, undefined, resultado.tipo === 'sucesso' ? undefined : 'exclusaoBloqueada');
        };
        mostrarPendente();
        return resultadosTrocaSenha.observar(mostrarPendente);
    }, [usuarioId, alertar]));
}