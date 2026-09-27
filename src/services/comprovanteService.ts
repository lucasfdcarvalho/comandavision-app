import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { gerarComprovanteHtml, DadosComprovante } from "../utils/gerarComprovanteHtml";

async function gerarPdf(dados: DadosComprovante): Promise<string> {
    const html = gerarComprovanteHtml(dados);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    return uri;
}

async function compartilhar(dados: DadosComprovante): Promise<{ compartilhado: boolean }> {
    const uri = await gerarPdf(dados);

    const disponivel = await Sharing.isAvailableAsync();
    if (!disponivel) {
        return { compartilhado: false };
    }

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
