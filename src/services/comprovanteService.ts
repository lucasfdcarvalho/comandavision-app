import { Platform } from "react-native";
import { EncodingType, File, Paths } from "expo-file-system";
import { writeAsStringAsync } from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { gerarComprovanteHtml, DadosComprovante } from "../utils/gerarComprovanteHtml";

async function gerarPdf(dados: DadosComprovante): Promise<string> {
    const html = gerarComprovanteHtml(dados);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    return uri;
}

async function gerarPdfCompartilhavelAndroid(dados: DadosComprovante): Promise<string> {
    // No Expo Go, o arquivo temporario do Print pode estar fora do cache acessivel ao app.
    const html = gerarComprovanteHtml(dados);
    const { base64 } = await Print.printToFileAsync({ html, base64: true });
    if (!base64) {
        throw new Error('N\u00e3o foi poss\u00edvel preparar o PDF do comprovante');
    }

    const arquivo = new File(Paths.cache, `comprovante-${Date.now()}.pdf`);
    await writeAsStringAsync(arquivo.uri, base64, { encoding: EncodingType.Base64 });
    return arquivo.uri;
}

async function compartilhar(dados: DadosComprovante): Promise<{ compartilhado: boolean }> {
    const disponivel = await Sharing.isAvailableAsync();
    if (!disponivel) {
        return { compartilhado: false };
    }

    const uri = Platform.OS === 'android'
        ? await gerarPdfCompartilhavelAndroid(dados)
        : await gerarPdf(dados);

    await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Comprovante ${dados.identificacaoComanda}`,
        UTI: "com.adobe.pdf",
    });

    return { compartilhado: true };
}

async function imprimir(dados: DadosComprovante): Promise<void> {
    const html = gerarComprovanteHtml(dados);
    await Print.printAsync({ html });
}

export const comprovanteService = {
    gerarPdf,
    compartilhar,
    imprimir,
};
