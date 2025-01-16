from collections import defaultdict
from math import log
import string
import logging
import tensorflow as tf
from tensorflow.keras.applications import VGG16
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.vgg16 import preprocess_input
import numpy as np
import websocket

def update_url_scores(old: dict[str, float], new: dict[str, float]):
    for url, score in new.items():
        if url in old:
            old[url] += score
        else:
            old[url] = score
    return old

def normalize_string(input_string: str) -> str:
    """
    Normalize the input string by removing punctuation and converting to lowercase.
    Args:
        input_string (str): The input string to normalize.
    Returns:
        str: The normalized string.
    """
    translation_table = str.maketrans(string.punctuation, ' ' * len(string.punctuation))
    string_without_punc = input_string.translate(translation_table)
    string_without_double_spaces = ' '.join(string_without_punc.split())
    return string_without_double_spaces.lower()

class SearchEngine:
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self._index: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self._documents: dict[str, str] = {}
        self._image_index: dict[str, np.ndarray] = {}
        self.k1 = k1
        self.b = b
        logging.basicConfig(level=logging.INFO)

    @property
    def posts(self) -> list[str]:
        return list(self._documents.keys())

    @property
    def number_of_documents(self) -> int:
        return len(self._documents)

    @property
    def avdl(self) -> float:
        # Cache the result to avoid recomputation
        if not hasattr(self, "_cached_avdl"):
            self._cached_avdl = sum(len(d) for d in self._documents.values()) / len(self._documents)
        return self._cached_avdl

    def idf(self, kw: str) -> float:
        N = self.number_of_documents
        n_kw = len(self.get_urls(kw))
        return log((N - n_kw + 0.5) / (n_kw + 0.5) + 1)

    def bm25(self, kw: str) -> dict[str, float]:
        result = {}
        idf_score = self.idf(kw)
        avdl = self.avdl
        for url, freq in self.get_urls(kw).items():
            numerator = freq * (self.k1 + 1)
            denominator = freq + self.k1 * (1 - self.b + self.b * len(self._documents[url]) / avdl)
            result[url] = idf_score * numerator / denominator
        return result

    def search(self, query: str) -> dict[str, float]:
        try:
            keywords = normalize_string(query).split(" ")
            url_scores: dict[str, float] = {}
            for kw in keywords:
                kw_urls_score = self.bm25(kw)
                url_scores = update_url_scores(url_scores, kw_urls_score)
            return url_scores
        except Exception as e:
            logging.error(f"Error during search: {e}")
            return {}

    def index(self, url: str, content: str) -> None:
        self._documents[url] = content
        words = normalize_string(content).split(" ")
        for word in words:
            self._index[word][url] += 1

    def bulk_index(self, documents: list[tuple[str, str]]):
        for url, content in documents:
            self.index(url, content)

    def get_urls(self, keyword: str) -> dict[str, int]:
        keyword = normalize_string(keyword)
        return self._index[keyword]

    def index_image(self, url: str, img_path: str) -> None:
        model = VGG16(weights='imagenet', include_top=False)
        img = image.load_img(img_path, target_size=(224, 224))
        x = image.img_to_array(img)
        x = np.expand_dims(x, axis=0)
        x = preprocess_input(x)
        features = model.predict(x)
        self._index_image_features(url, features)

    def _index_image_features(self, url: str, features: np.ndarray):
        self._image_index[url] = features

    def index_live_transcript(self, url: str, transcript: str) -> None:
        self.index(url, transcript)

    def setup_websocket(self, ws_url: str):
        ws = websocket.WebSocketApp(ws_url, on_message=self.on_message)
        ws.run_forever()

    def on_message(self, ws, message):
        self.index_live_transcript("live_video", message)
