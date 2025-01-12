
import tensorflow as tf
import tensorflow_datasets as tfds

# Load a dataset from TensorFlow Datasets
dataset, info = tfds.load('mnist', with_info=True, as_supervised=True)

# Split the dataset into training and testing sets
train_dataset, test_dataset = dataset['train'], dataset['test']

# Normalize the images
def normalize_img(image, label):
    return tf.cast(image, tf.float32) / 255.0, label

train_dataset = train_dataset.map(normalize_img, num_parallel_calls=tf.data.experimental.AUTOTUNE)
test_dataset = test_dataset.map(normalize_img, num_parallel_calls=tf.data.experimental.AUTOTUNE)

# Batch and prefetch the datasets
train_dataset = train_dataset.cache().shuffle(info.splits['train'].num_examples).batch(128).prefetch(tf.data.experimental.AUTOTUNE)
test_dataset = test_dataset.batch(128).cache().prefetch(tf.data.experimental.AUTOTUNE)

# Define a simple model
model = tf.keras.models.Sequential([
    tf.keras.layers.Flatten(input_shape=(28, 28)),
    tf.keras.layers.Dense(128, activation='relu'),
    tf.keras.layers.Dense(10)
])

# Compile the model
model.compile(
    optimizer=tf.keras.optimizers.Adam(),
    loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
    metrics=[tf.keras.metrics.SparseCategoricalAccuracy()],
)

# Train the model
model.fit(train_dataset, epochs=5)

# Evaluate the model
model.evaluate(test_dataset)