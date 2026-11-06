import { Platform } from "react-native";
import { EncodingType, File, Paths } from "expo-file-system";
import { writeAsStringAsync } from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { DadosRelatorioGerencial } from "../types/Relatorio";
import { gerarRelatorioHtml } from "../utils/gerarRelatorioHtml";

export type ResultadoExportacaoRelatorio = 'compartilhado' | 'impressao';

async function exportar(dados: DadosRelatorioGerencial): Promise<ResultadoExportacaoRelatorio> {
    const html = gerarRelatorioHtml(dados);

    // No navegador, o Expo abre o dialogo de impressao/salvamento em PDF e nao
    // permite compartilhar um arquivo local por URI.
    if (Platform.OS === 'web') {
        await Print.printToFileAsync({ html, base64: false });
        return 'impressao';
    }

    if (await Sharing.isAvailableAsync()) {
        // O arquivo temporario do expo-print pode ficar fora do escopo de
        // leitura da experiencia no Expo Go. Gerar o conteudo em base64 e
        // grava-lo no cache oficial cria uma URI autorizada para compartilhar.
        const { base64 } = await Print.printToFileAsync({ html, base64: true });
        if (!base64) {
            throw new Error('O PDF foi gerado sem conteudo para compartilhamento');
        }

        const arquivoCompartilhavel = new File(
            Paths.cache,
            `relatorio-gerencial-${Date.now()}.pdf`,
        );
        await writeAsStringAsync(arquivoCompartilhavel.uri, base64, {
            encoding: EncodingType.Base64,
        });

        await Sharing.shareAsync(arquivoCompartilhavel.uri, {
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
            dialogTitle: 'Relat\u00f3rio gerencial ComandaVision',
        });
        return 'compartilhado';
    }

    await Print.printAsync({ html });
    return 'impressao';
}

export const relatorioService = { exportar };
