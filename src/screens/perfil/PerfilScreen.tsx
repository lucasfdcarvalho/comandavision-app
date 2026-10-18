import { View, ScrollView, StyleSheet } from "react-native";
import { Text } from "../../components/ui/Texto";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useDialogo } from "../../contexts/DialogoContext";
import { Cartao } from "../../components/ui/Cartao";
import { SecondaryButton } from "../../components/SecondaryButton";
import { colors } from "../../theme/colors";
import { espacamento, raio, tipografia } from "../../theme/tokens";

const NOME_PAPEL = {
    DONO: 'Dono',
    FUNCIONARIO: 'Funcionário',
} as const;

export function PerfilScreen() {
    const { usuario, sair } = useAuth();
    const { alertar } = useDialogo();
    const inicial = (usuario?.email ?? '?').charAt(0).toUpperCase();

    function confirmarSaida() {
        alertar('Sair da conta', 'Você precisará entrar de novo com e-mail e senha.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sair', style: 'destructive', onPress: sair },
        ]);
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
            <View style={styles.cabecalho}>
                <View style={styles.avatar}>
                    <Text style={styles.inicial}>{inicial}</Text>
                </View>
                <Text style={styles.email} numberOfLines={1}>{usuario?.email}</Text>
                {usuario?.papel ? (
                    <View style={styles.seloPapel}>
                        <Feather name={usuario.papel === 'DONO' ? 'shield' : 'user'} size={13} color={colors.laranjaTexto} />
                        <Text style={styles.textoPapel}>{NOME_PAPEL[usuario.papel]}</Text>
                    </View>
                ) : null}
            </View>

            <Cartao style={styles.cartao}>
                <View style={styles.linha}>
                    <Feather name="mail" size={18} color={colors.textoSecundario} />
                    <View style={styles.flex}>
                        <Text style={styles.rotulo}>E-mail</Text>
                        <Text style={styles.valor} numberOfLines={1}>{usuario?.email}</Text>
                    </View>
                </View>
                <View style={styles.divisor} />
                <View style={styles.linha}>
                    <Feather name="briefcase" size={18} color={colors.textoSecundario} />
                    <View style={styles.flex}>
                        <Text style={styles.rotulo}>Acesso</Text>
                        <Text style={styles.valor}>
                            {usuario?.papel === 'DONO' ? 'Comandas, indicadores e gestão' : 'Comandas e pagamentos'}
                        </Text>
                    </View>
                </View>
            </Cartao>

            <SecondaryButton titulo="Sair" icone="log-out" onPress={confirmarSaida} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    conteudo: {
        padding: espacamento.lg,
        gap: espacamento.xl,
    },
    cabecalho: {
        alignItems: 'center',
        gap: espacamento.sm,
        paddingTop: espacamento.lg,
    },
    avatar: {
        width: 80,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: espacamento.xs,
        backgroundColor: colors.laranjaClaro,
        borderWidth: 1,
        borderColor: colors.laranjaBorda,
        borderRadius: 40,
    },
    inicial: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.laranjaTexto,
    },
    email: {
        ...tipografia.subtitulo,
        color: colors.textoPrimario,
    },
    seloPapel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacamento.xs,
        paddingVertical: espacamento.xs,
        paddingHorizontal: espacamento.md,
        backgroundColor: colors.laranjaClaro,
        borderRadius: raio.redondo,
    },
    textoPapel: {
        ...tipografia.rotuloForte,
        color: colors.laranjaTexto,
    },
    cartao: {
        gap: espacamento.md,
    },
    linha: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacamento.md,
    },
    flex: {
        flex: 1,
        gap: 2,
    },
    rotulo: {
        ...tipografia.legenda,
        color: colors.textoSecundario,
    },
    valor: {
        ...tipografia.corpo,
        color: colors.textoPrimario,
    },
    divisor: {
        height: 1,
        backgroundColor: colors.borda,
    },
});
