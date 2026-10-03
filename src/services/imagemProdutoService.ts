import { File } from "expo-file-system";
import { supabase } from "./supabase";

// Bucket público de leitura no Supabase Storage. A escrita é liberada só para o papel DONO
// (políticas criadas no painel do Supabase); a API guarda apenas a URL pública.
const BUCKET = 'produtos';

function extensaoDoArquivo(uri: string, mimeType?: string | null): string {
    if (mimeType?.startsWith('image/')) {
        return mimeType.replace('image/', '').replace('jpeg', 'jpg');
    }

    const extensao = uri.split('?')[0].split('.').pop()?.toLowerCase();
    return extensao && extensao.length <= 4 ? extensao : 'jpg';
}

async function enviarImagem(uri: string, mimeType?: string | null): Promise<string> {
    const extensao = extensaoDoArquivo(uri, mimeType);
    const caminho = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extensao}`;
    const conteudo = await new File(uri).arrayBuffer();

    const { error } = await supabase.storage.from(BUCKET).upload(caminho, conteudo, {
        contentType: mimeType ?? `image/${extensao === 'jpg' ? 'jpeg' : extensao}`,
        upsert: false,
    });

    if (error) {
        throw new Error('Não foi possível enviar a imagem do produto');
    }

    return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

export const imagemProdutoService = {
    enviarImagem,
};
