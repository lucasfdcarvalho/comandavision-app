import { useEffect, useRef } from 'react';
import { AccessibilityInfo, ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { EstadoDialogo, TipoDialogo } from '../utils/dialogoController';

type Props = {
    dialogo: EstadoDialogo;
    onFechar: () => void;
    onSelecionar: (indice: number) => void;
};

const ICONES: Record<TipoDialogo, keyof typeof Feather.glyphMap> = {
    info: 'info', sucesso: 'check-circle', aviso: 'alert-triangle', erro: 'alert-circle',
};

export function Dialogo({ dialogo, onFechar, onSelecionar }: Props) {
    const tituloRef = useRef<Text>(null);
    const ocupado = dialogo.botaoEmAndamento !== null;
    const destrutivo = dialogo.botoes.some((botao) => botao.style === 'destructive');
    const corIcone = destrutivo || dialogo.tipo === 'erro' ? colors.erro
        : dialogo.tipo === 'sucesso' ? colors.sucesso : colors.textoPrimario;

    function focarTitulo() {
        if (Platform.OS !== 'web' && tituloRef.current) {
            AccessibilityInfo.sendAccessibilityEvent(tituloRef.current, 'focus');
        }
    }

    useEffect(() => {
        const timer = setTimeout(focarTitulo, 100);
        return () => clearTimeout(timer);
    }, [dialogo.id, dialogo.titulo]);

    return (
        <Modal transparent animationType="fade" visible onRequestClose={onFechar} onShow={focarTitulo} presentationStyle="overFullScreen">
            <SafeAreaProvider>
                <SafeAreaView style={styles.fundo}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} disabled={ocupado} accessible={false} importantForAccessibility="no" />
                    <View style={styles.cartao} accessibilityViewIsModal onAccessibilityEscape={onFechar}>
                        <ScrollView style={styles.rolagem} bounces={false} contentContainerStyle={styles.conteudo}>
                            <View style={styles.cabecalho}>
                                <View style={styles.icone} accessible={false}>
                                    <Feather name={destrutivo ? 'alert-triangle' : ICONES[dialogo.tipo]} size={28} color={corIcone} />
                                </View>
                                <Pressable onPress={onFechar} disabled={ocupado} accessibilityRole="button" accessibilityLabel="Fechar mensagem" accessibilityHint={dialogo.aoFechar ? 'Fecha a mensagem e continua a navegação' : 'Fecha sem confirmar a ação'} accessibilityState={{ disabled: ocupado }} style={({ pressed }) => [styles.fechar, pressed && styles.pressionado]}>
                                    <Feather name="x" size={22} color={colors.textoSecundario} />
                                </Pressable>
                            </View>
                            <Text ref={tituloRef} accessible accessibilityRole="header" style={styles.titulo}>{dialogo.titulo}</Text>
                            <Text style={styles.mensagem}>{dialogo.mensagem}</Text>
                            {ocupado ? <Text accessibilityLiveRegion="polite" style={styles.andamento}>Aguarde, concluindo a ação…</Text> : null}
                            {dialogo.botoes.length > 0 ? <View style={styles.acoes}>
                                {dialogo.botoes.map((botao, indice) => {
                                    const cancelar = botao.style === 'cancel';
                                    const excluir = botao.style === 'destructive';
                                    return (
                                        <Pressable key={indice} onPress={() => onSelecionar(indice)} disabled={ocupado} accessibilityRole="button" accessibilityLabel={botao.text} accessibilityState={{ disabled: ocupado, busy: dialogo.botaoEmAndamento === indice }} style={({ pressed }) => [styles.botao, cancelar ? styles.cancelar : excluir ? styles.destrutivo : styles.primario, ocupado && styles.inativo, pressed && styles.pressionado]}>
                                            {dialogo.botaoEmAndamento === indice ? <ActivityIndicator color={excluir ? colors.superficie : colors.textoPrimario} accessible={false} /> : null}
                                            <Text style={[styles.textoBotao, excluir && styles.textoDestrutivo]}>{botao.text}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View> : null}
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </SafeAreaProvider>
        </Modal>
    );
}

const styles = StyleSheet.create({
    fundo: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(31, 31, 31, 0.5)' },
    cartao: { width: '100%', maxWidth: 420, maxHeight: '100%', backgroundColor: colors.superficie, borderRadius: 16, borderTopWidth: 4, borderTopColor: colors.laranja, overflow: 'hidden' },
    rolagem: { flexGrow: 0, flexShrink: 1 },
    conteudo: { padding: 20, gap: 16 },
    cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    icone: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fundo },
    fechar: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
    titulo: { fontSize: 22, fontWeight: '700', color: colors.textoPrimario },
    mensagem: { fontSize: 16, color: colors.textoSecundario, lineHeight: 24 },
    andamento: { fontSize: 14, color: colors.textoSecundario },
    acoes: { gap: 10, marginTop: 4 },
    botao: { minHeight: 50, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    primario: { backgroundColor: colors.laranja },
    cancelar: { backgroundColor: colors.superficie, borderWidth: 1, borderColor: colors.textoSecundario },
    destrutivo: { backgroundColor: colors.erro },
    textoBotao: { fontSize: 16, fontWeight: '700', textAlign: 'center', flexShrink: 1, color: colors.textoPrimario },
    textoDestrutivo: { color: colors.superficie },
    inativo: { opacity: 0.6 },
    pressionado: { opacity: 0.85 },
});
